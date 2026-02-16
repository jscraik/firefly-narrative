//! Per-repo git hook installer (hooks-first integration).

use crate::attribution::utils::fetch_repo_root;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn shell_quote_sh(value: &str) -> String {
    // Safely quote a string for POSIX `sh` using single quotes, escaping embedded `'` as: '\''.
    // This prevents accidental expansion (e.g. `$HOME`) when hook scripts run.
    let mut out = String::with_capacity(value.len() + 2);
    out.push('\'');
    for ch in value.chars() {
        if ch == '\'' {
            out.push_str("'\"'\"'");
        } else {
            out.push(ch);
        }
    }
    out.push('\'');
    out
}

fn resolve_hooks_dir(repo_root: &str) -> PathBuf {
    // Respect core.hooksPath if configured. Git allows this to be absolute or relative to repo root.
    // If unset, default to .git/hooks.
    let configured = Command::new("git")
        .args(["config", "--get", "core.hooksPath"])
        .current_dir(repo_root)
        .output()
        .ok()
        .and_then(|out| {
            if !out.status.success() {
                return None;
            }
            let raw = String::from_utf8_lossy(&out.stdout).trim().to_string();
            (!raw.is_empty()).then_some(raw)
        });

    if let Some(hooks_path) = configured {
        let p = PathBuf::from(hooks_path);
        if p.is_absolute() {
            return p;
        }
        return Path::new(repo_root).join(p);
    }

    Path::new(repo_root).join(".git").join("hooks")
}

pub fn ensure_executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path).map_err(|e| e.to_string())?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn write_hook_file(path: &Path, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())?;
    ensure_executable(path)?;
    Ok(())
}

pub fn build_post_commit_hook(db_path: &str, cli_path: &str) -> String {
    let db_path = shell_quote_sh(db_path);
    let cli_path = shell_quote_sh(cli_path);
    format!(
        r#"#!/bin/sh
set +e

if [ -n "$NARRATIVE_HOOK_RUNNING" ]; then
  exit 0
fi
export NARRATIVE_HOOK_RUNNING=1
export NARRATIVE_DB_PATH={db_path}
export NARRATIVE_CLI_PATH={cli_path}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
mkdir -p "$repo_root/.narrative/meta" 2>/dev/null
log="$repo_root/.narrative/meta/hooks.log"

perl -e 'alarm shift; exec @ARGV' 5 "$NARRATIVE_CLI_PATH" hook post-commit --repo "$repo_root" 2>>"$log" || true
exit 0
"#
    )
}

pub fn build_post_merge_hook(db_path: &str, cli_path: &str) -> String {
    let db_path = shell_quote_sh(db_path);
    let cli_path = shell_quote_sh(cli_path);
    format!(
        r#"#!/bin/sh
set +e

if [ -n "$NARRATIVE_HOOK_RUNNING" ]; then
  exit 0
fi
export NARRATIVE_HOOK_RUNNING=1
export NARRATIVE_DB_PATH={db_path}
export NARRATIVE_CLI_PATH={cli_path}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
mkdir -p "$repo_root/.narrative/meta" 2>/dev/null
log="$repo_root/.narrative/meta/hooks.log"

perl -e 'alarm shift; exec @ARGV' 5 "$NARRATIVE_CLI_PATH" hook post-merge --repo "$repo_root" 2>>"$log" || true
exit 0
"#
    )
}

pub fn build_post_rewrite_hook(db_path: &str, cli_path: &str) -> String {
    let db_path = shell_quote_sh(db_path);
    let cli_path = shell_quote_sh(cli_path);
    format!(
        r#"#!/bin/sh
set +e

if [ -n "$NARRATIVE_HOOK_RUNNING" ]; then
  exit 0
fi
export NARRATIVE_HOOK_RUNNING=1
export NARRATIVE_DB_PATH={db_path}
export NARRATIVE_CLI_PATH={cli_path}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
mkdir -p "$repo_root/.narrative/meta" 2>/dev/null
log="$repo_root/.narrative/meta/hooks.log"

cmd="$1"
tmp="${{TMPDIR:-/tmp}}/narrative-post-rewrite-$$.txt"
cat > "$tmp"

perl -e 'alarm shift; exec @ARGV' 8 "$NARRATIVE_CLI_PATH" hook post-rewrite --repo "$repo_root" --command "$cmd" --rewritten "$tmp" 2>>"$log" || true
rm -f "$tmp" 2>/dev/null || true
exit 0
"#
    )
}

pub async fn install_repo_hooks(
    repo_root: &str,
    db_path: &str,
    cli_path: &str,
) -> Result<(), String> {
    let dir = resolve_hooks_dir(repo_root);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    write_hook_file(
        &dir.join("post-commit"),
        &build_post_commit_hook(db_path, cli_path),
    )?;
    write_hook_file(
        &dir.join("post-rewrite"),
        &build_post_rewrite_hook(db_path, cli_path),
    )?;
    write_hook_file(
        &dir.join("post-merge"),
        &build_post_merge_hook(db_path, cli_path),
    )?;

    Ok(())
}

pub async fn uninstall_repo_hooks(repo_root: &str) -> Result<(), String> {
    let dir = resolve_hooks_dir(repo_root);
    for name in ["post-commit", "post-rewrite", "post-merge"] {
        let path = dir.join(name);
        if path.exists() {
            let _ = fs::remove_file(&path);
        }
    }
    Ok(())
}

pub async fn install_repo_hooks_by_id(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    db_path: &str,
    cli_path: &str,
) -> Result<(), String> {
    let repo_root = fetch_repo_root(db, repo_id).await?;
    install_repo_hooks(&repo_root, db_path, cli_path).await
}

pub async fn uninstall_repo_hooks_by_id(db: &sqlx::SqlitePool, repo_id: i64) -> Result<(), String> {
    let repo_root = fetch_repo_root(db, repo_id).await?;
    uninstall_repo_hooks(&repo_root).await
}

pub struct RepoHooksStatus {
    pub hooks_dir: PathBuf,
    pub installed: bool,
}

pub async fn get_repo_hooks_status(
    db: &sqlx::SqlitePool,
    repo_id: i64,
) -> Result<RepoHooksStatus, String> {
    let repo_root = fetch_repo_root(db, repo_id).await?;
    let dir = resolve_hooks_dir(&repo_root);
    let installed = dir.join("post-commit").exists();
    Ok(RepoHooksStatus {
        hooks_dir: dir,
        installed,
    })
}
