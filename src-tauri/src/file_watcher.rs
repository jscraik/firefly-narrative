//! File watcher for automatic session import
//!
//! Watches AI tool directories for new/modified session files
//! and emits events to the frontend for auto-import.

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use tauri::Emitter;

/// Start watching AI session directories for changes
///
/// Watches:
/// - ~/.claude/projects/ (Claude Code)
/// - ~/.cursor/composer/ (Cursor)
/// - ~/.continue/ (Continue.dev)
/// - ~/.gemini/ (Google Gemini)
///
/// Emits "session-file-changed" events to the frontend when
/// session files are created or modified.
pub fn start_session_watcher(
    app_handle: tauri::AppHandle,
    _repo_root: String,
) -> Result<RecommendedWatcher, String> {
    let watch_paths = vec![
        // Claude Code
        dirs::home_dir()
            .map(|h| h.join(".claude/projects"))
            .filter(|p| p.exists()),
        // Cursor
        dirs::home_dir()
            .map(|h| h.join(".cursor/composer"))
            .filter(|p| p.exists()),
        // Continue.dev
        dirs::home_dir()
            .map(|h| h.join(".continue"))
            .filter(|p| p.exists()),
        // Gemini
        dirs::home_dir()
            .map(|h| h.join(".gemini"))
            .filter(|p| p.exists()),
    ];

    // Filter to existing paths
    let existing_paths: Vec<PathBuf> = watch_paths.into_iter().flatten().collect();

    if existing_paths.is_empty() {
        return Err("No AI tool directories found to watch".to_string());
    }

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        match res {
            Ok(event) => {
                // Only care about create and modify events
                let is_relevant = event.kind.is_create() || event.kind.is_modify();

                if is_relevant {
                    if let Some(path) = event.paths.first() {
                        if is_session_file(path) {
                            // Emit event to frontend
                            let path_str = path.to_string_lossy().to_string();
                            let tool = detect_tool_from_path(path);

                            let payload = serde_json::json!({
                                "path": path_str,
                                "tool": tool,
                                "timestamp": chrono::Utc::now().to_rfc3339(),
                            });

                            if let Err(e) = app_handle.emit("session-file-changed", payload) {
                                eprintln!("Failed to emit session-file-changed: {}", e);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("File watcher error: {:?}", e);
            }
        }
    })
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Watch each path
    for path in existing_paths {
        watcher
            .watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch {:?}: {}", path, e))?;

        println!("[FileWatcher] Watching: {:?}", path);
    }

    Ok(watcher)
}

/// Check if a path is a session file we care about
fn is_session_file(path: &Path) -> bool {
    let ext = path.extension().and_then(|e| e.to_str());
    let path_str = path.to_string_lossy();

    match ext {
        Some("jsonl") => {
            // Claude Code uses .jsonl
            path_str.contains(".claude")
        }
        Some("json") => {
            // Various tools use .json
            path_str.contains(".claude")
                || path_str.contains(".cursor")
                || path_str.contains("gemini")
                || path_str.contains("copilot")
                || path_str.contains(".continue")
        }
        Some("database") => {
            // Cursor uses SQLite .database files
            path_str.contains(".cursor")
        }
        _ => false,
    }
}

/// Detect which AI tool a file belongs to based on its path
fn detect_tool_from_path(path: &Path) -> String {
    let path_str = path.to_string_lossy();

    if path_str.contains(".claude") {
        "claude_code".to_string()
    } else if path_str.contains(".cursor") {
        "cursor".to_string()
    } else if path_str.contains(".continue") {
        "continue".to_string()
    } else if path_str.contains("gemini") || path_str.contains("google-ai") {
        "gemini".to_string()
    } else if path_str.contains("copilot") {
        "copilot".to_string()
    } else {
        "unknown".to_string()
    }
}

/// Stop the file watcher (drops it)
#[allow(dead_code)]
pub fn stop_session_watcher(watcher: RecommendedWatcher) {
    drop(watcher);
    println!("[FileWatcher] Stopped");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_session_file() {
        // Claude files
        assert!(is_session_file(&PathBuf::from(
            "/home/user/.claude/projects/foo/session.jsonl"
        )));

        // Cursor files
        assert!(is_session_file(&PathBuf::from(
            "/home/user/.cursor/composer/composer.database"
        )));
        assert!(is_session_file(&PathBuf::from(
            "/home/user/.cursor/sessions/session.json"
        )));

        // Continue files
        assert!(is_session_file(&PathBuf::from(
            "/home/user/.continue/sessions/history.json"
        )));

        // Non-session files
        assert!(!is_session_file(&PathBuf::from("/home/user/random.txt")));
        assert!(!is_session_file(&PathBuf::from("/home/user/doc.pdf")));
    }

    #[test]
    fn test_detect_tool_from_path() {
        assert_eq!(
            detect_tool_from_path(&PathBuf::from(
                "/home/user/.claude/projects/foo/session.jsonl"
            )),
            "claude_code"
        );
        assert_eq!(
            detect_tool_from_path(&PathBuf::from("/home/user/.cursor/composer.db")),
            "cursor"
        );
        assert_eq!(
            detect_tool_from_path(&PathBuf::from("/home/user/.continue/history.json")),
            "continue"
        );
        assert_eq!(
            detect_tool_from_path(&PathBuf::from("/home/user/random.json")),
            "unknown"
        );
    }
}
