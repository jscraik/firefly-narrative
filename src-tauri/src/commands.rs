use std::{
    fs,
    path::{Component, Path, PathBuf},
};

fn canonicalize_existing(path: &Path) -> Result<PathBuf, String> {
    path.canonicalize()
        .map_err(|e| format!("failed to canonicalize {}: {e}", path.display()))
}

fn narrative_base(repo_root: &str) -> Result<PathBuf, String> {
    let repo_root = repo_root.trim();
    if repo_root.is_empty() {
        return Err("repo root is empty (no repository selected)".into());
    }
    let root = PathBuf::from(repo_root);
    if !root.exists() {
        return Err(format!("repo root does not exist: {repo_root}"));
    }
    let root = canonicalize_existing(&root)?;
    Ok(root.join(".narrative"))
}

fn reject_symlink(path: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if metadata.file_type().is_symlink() {
        return Err(format!(
            "symlinks are not allowed under .narrative: {}",
            path.display()
        ));
    }
    Ok(())
}

/// Walk every component of `rel` under `base`, rejecting symlinks at each step.
fn checked_narrative_path(base: &Path, rel: &Path) -> Result<PathBuf, String> {
    let mut current = base.to_path_buf();
    if current.exists() {
        reject_symlink(&current)?;
    }

    for component in rel.components() {
        let Component::Normal(part) = component else {
            return Err("relative path contains invalid components".into());
        };
        current.push(part);
        if current.exists() {
            reject_symlink(&current)?;
        }
    }

    Ok(current)
}

fn validate_rel(rel: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(rel);
    if p.is_absolute() {
        return Err("relative path must not be absolute".into());
    }
    for c in p.components() {
        match c {
            Component::Normal(_) => {}
            _ => return Err("relative path contains invalid components".into()),
        }
    }
    Ok(p)
}

#[tauri::command(rename_all = "camelCase")]
pub fn ensure_narrative_dirs(repo_root: String) -> Result<(), String> {
    let base = narrative_base(&repo_root)?;
    for rel in [
        "meta/commits",
        "meta/branches",
        "sessions/imported",
        "tests/imported",
        "trace",
        "trace/generated",
        "rules",
    ] {
        let target = checked_narrative_path(&base, &validate_rel(rel)?)?;
        fs::create_dir_all(target).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn file_exists(repo_root: String, relative_path: String) -> Result<bool, String> {
    let repo_root = repo_root.trim().to_string();
    if repo_root.is_empty() {
        return Err("repo root is empty (no repository selected)".into());
    }
    let root = PathBuf::from(&repo_root);
    if !root.exists() {
        return Err(format!("repo root does not exist: {repo_root}"));
    }
    let root = canonicalize_existing(&root)?;
    let rel = validate_rel(&relative_path)?;
    let target = root.join(rel);
    Ok(target.exists())
}

#[tauri::command(rename_all = "camelCase")]
pub fn write_narrative_file(
    repo_root: String,
    relative_path: String,
    contents: String,
) -> Result<(), String> {
    let base = narrative_base(&repo_root)?;
    let rel = validate_rel(&relative_path)?;
    let target = checked_narrative_path(&base, &rel)?;

    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(&target, contents).map_err(|e| format!("write failed: {e}"))?;
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn read_narrative_file(repo_root: String, relative_path: String) -> Result<String, String> {
    let base = narrative_base(&repo_root)?;
    let rel = validate_rel(&relative_path)?;
    let target = checked_narrative_path(&base, &rel)?;

    fs::read_to_string(&target).map_err(|e| format!("read failed: {e}"))
}

fn walk_files(dir: &Path, base: &Path, out: &mut Vec<String>) -> Result<(), String> {
    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_symlink() {
            return Err(format!(
                "symlinks are not allowed under .narrative: {}",
                p.display()
            ));
        }
        if file_type.is_dir() {
            walk_files(&p, base, out)?;
        } else if file_type.is_file() {
            let rel = p
                .strip_prefix(base)
                .map_err(|_| "strip_prefix failed".to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            out.push(rel);
        }
    }
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub fn list_narrative_files(
    repo_root: String,
    relative_dir: String,
) -> Result<Vec<String>, String> {
    let base = narrative_base(&repo_root)?;
    let rel = validate_rel(&relative_dir)?;
    let dir = checked_narrative_path(&base, &rel)?;

    if !dir.exists() {
        return Ok(vec![]);
    }
    if !dir.is_dir() {
        return Err("relative_dir must point to a directory".into());
    }

    let mut out: Vec<String> = vec![];
    walk_files(&dir, &base, &mut out)?;
    out.sort();
    Ok(out)
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.exists() || !p.is_file() {
        return Err("path does not exist or is not a file".into());
    }

    let meta = fs::metadata(&p).map_err(|e| e.to_string())?;
    // Hard cap (MVP): 5MB
    if meta.len() > 5 * 1024 * 1024 {
        return Err("file too large (max 5MB)".into());
    }

    fs::read_to_string(&p).map_err(|e| format!("read failed: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[cfg(unix)]
    use std::os::unix::fs::symlink;

    #[test]
    fn write_and_read_narrative_file_with_normal_paths() {
        let repo = tempdir().unwrap();
        let repo_root = repo.path().to_string_lossy().to_string();

        ensure_narrative_dirs(repo_root.clone()).unwrap();
        write_narrative_file(repo_root.clone(), "meta/repo.json".into(), "hello".into()).unwrap();

        let contents = read_narrative_file(repo_root.clone(), "meta/repo.json".into()).unwrap();
        assert_eq!(contents, "hello");

        let files = list_narrative_files(repo_root, "meta".into()).unwrap();
        assert_eq!(files, vec!["meta/repo.json"]);
    }

    #[cfg(unix)]
    #[test]
    fn write_narrative_file_rejects_symlinked_parent() {
        let repo = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let repo_root = repo.path().to_string_lossy().to_string();

        fs::create_dir_all(repo.path().join(".narrative")).unwrap();
        symlink(outside.path(), repo.path().join(".narrative/meta")).unwrap();

        let err =
            write_narrative_file(repo_root, "meta/repo.json".into(), "hello".into()).unwrap_err();
        assert!(
            err.contains("symlinks are not allowed"),
            "unexpected error: {err}"
        );
    }

    #[cfg(unix)]
    #[test]
    fn read_narrative_file_rejects_symlinked_file() {
        let repo = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let repo_root = repo.path().to_string_lossy().to_string();

        fs::create_dir_all(repo.path().join(".narrative/meta")).unwrap();
        fs::write(outside.path().join("secret.txt"), "secret").unwrap();
        symlink(
            outside.path().join("secret.txt"),
            repo.path().join(".narrative/meta/repo.json"),
        )
        .unwrap();

        let err = read_narrative_file(repo_root, "meta/repo.json".into()).unwrap_err();
        assert!(
            err.contains("symlinks are not allowed"),
            "unexpected error: {err}"
        );
    }

    #[cfg(unix)]
    #[test]
    fn list_narrative_files_rejects_symlink_entries() {
        let repo = tempdir().unwrap();
        let outside = tempdir().unwrap();
        let repo_root = repo.path().to_string_lossy().to_string();

        fs::create_dir_all(repo.path().join(".narrative/meta")).unwrap();
        fs::write(outside.path().join("secret.txt"), "secret").unwrap();
        symlink(
            outside.path().join("secret.txt"),
            repo.path().join(".narrative/meta/link.txt"),
        )
        .unwrap();

        let err = list_narrative_files(repo_root, "meta".into()).unwrap_err();
        assert!(
            err.contains("symlinks are not allowed"),
            "unexpected error: {err}"
        );
    }
}
