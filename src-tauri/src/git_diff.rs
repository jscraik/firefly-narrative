use git2::{DiffFormat, DiffOptions, Oid, Repository};
use serde::Serialize;

#[derive(Serialize)]
pub struct AddedRange {
    pub start: i64,
    pub end: i64,
}

#[tauri::command(rename_all = "camelCase")]
pub fn get_commit_added_ranges(
    repo_root: String,
    commit_sha: String,
    file_path: String,
) -> Result<Vec<AddedRange>, String> {
    let repo = Repository::open(repo_root).map_err(|e| e.to_string())?;
    let oid = Oid::from_str(&commit_sha).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| e.to_string())?
                .tree()
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    opts.pathspec(file_path);
    opts.context_lines(0);

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut ranges: Vec<AddedRange> = Vec::new();
    let mut current_start: Option<i64> = None;
    let mut previous_line: Option<i64> = None;

    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        if line.origin() == '+' {
            if let Some(new_lineno) = line.new_lineno() {
                let new_line = new_lineno as i64;
                match (current_start, previous_line) {
                    (Some(start), Some(prev)) if new_line == prev + 1 => {
                        previous_line = Some(new_line);
                        current_start = Some(start);
                    }
                    _ => {
                        if let (Some(start), Some(prev)) = (current_start, previous_line) {
                            ranges.push(AddedRange { start, end: prev });
                        }
                        current_start = Some(new_line);
                        previous_line = Some(new_line);
                    }
                }
            }
        } else if current_start.is_some() {
            if let (Some(start), Some(prev)) = (current_start, previous_line) {
                ranges.push(AddedRange { start, end: prev });
            }
            current_start = None;
            previous_line = None;
        }
        true
    })
    .map_err(|e| e.to_string())?;

    if let (Some(start), Some(prev)) = (current_start, previous_line) {
        ranges.push(AddedRange { start, end: prev });
    }

    Ok(ranges)
}
