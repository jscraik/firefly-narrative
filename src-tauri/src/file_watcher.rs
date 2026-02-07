//! File watcher for automatic session import
//!
//! Watches AI tool directories for new/modified session files
//! and emits events to the frontend for auto-import.

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Arc};
use std::time::{Duration, Instant};
use tauri::Emitter;

/// Start watching AI session directories for changes.
///
/// Emits "session-file-changed" events to the frontend when
/// session files are created or modified.
pub fn start_session_watcher(
    app_handle: tauri::AppHandle,
    watch_paths: Vec<String>,
) -> Result<RecommendedWatcher, String> {
    let existing_paths: Vec<PathBuf> = watch_paths
        .into_iter()
        .filter_map(|raw| expand_path(&raw))
        .filter(|p| p.exists())
        .collect();

    if existing_paths.is_empty() {
        return Err("No AI tool directories found to watch".to_string());
    }

    let allowed_roots = Arc::new(existing_paths.clone());
    let (tx, rx) = mpsc::channel::<PathBuf>();

    let worker_handle = app_handle.clone();
    let worker_roots = Arc::clone(&allowed_roots);
    std::thread::spawn(move || {
        let debounce_window = Duration::from_millis(500);
        let tick = Duration::from_millis(200);
        let mut pending: HashMap<PathBuf, PendingEntry> = HashMap::new();

        loop {
            match rx.recv_timeout(tick) {
                Ok(path) => {
                    let entry = pending.entry(path.clone()).or_insert_with(PendingEntry::default);
                    entry.last_seen = Instant::now();
                    entry.last_sig = file_signature(&path);
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
            }

            let now = Instant::now();
            let mut ready = Vec::new();

            for (path, entry) in pending.iter_mut() {
                if now.duration_since(entry.last_seen) < debounce_window {
                    continue;
                }

                if !is_under_roots(path, worker_roots.as_ref()) || is_symlink(path) {
                    ready.push(path.clone());
                    continue;
                }

                let current_sig = file_signature(path);
                if current_sig.is_some() && current_sig == entry.last_sig {
                    ready.push(path.clone());
                } else {
                    entry.last_seen = now;
                    entry.last_sig = current_sig;
                }
            }

            for path in ready {
                pending.remove(&path);

                if !is_session_file(&path) {
                    continue;
                }
                if !is_under_roots(&path, worker_roots.as_ref()) || is_symlink(&path) {
                    continue;
                }

                let path_str = path.to_string_lossy().to_string();
                let tool = detect_tool_from_path(&path);
                let payload = serde_json::json!({
                    "path": path_str,
                    "tool": tool,
                    "timestamp": chrono::Utc::now().to_rfc3339(),
                });

                if let Err(e) = worker_handle.emit("session-file-changed", payload) {
                    eprintln!("Failed to emit session-file-changed: {}", e);
                }
            }
        }
    });

    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        match res {
            Ok(event) => {
                // Only care about create and modify events
                let is_relevant = event.kind.is_create() || event.kind.is_modify();

                if is_relevant {
                    if let Some(path) = event.paths.first() {
                        let candidate = path.to_path_buf();

                        if !is_session_file(&candidate) {
                            return;
                        }
                        if !is_under_roots(&candidate, allowed_roots.as_ref()) {
                            return;
                        }
                        let _ = tx.send(candidate);
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

fn expand_path(raw: &str) -> Option<PathBuf> {
    if raw.trim().is_empty() {
        return None;
    }
    if let Some(stripped) = raw.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return Some(home.join(stripped));
        }
    }
    Some(PathBuf::from(raw))
}

fn is_under_roots(path: &Path, roots: &[PathBuf]) -> bool {
    roots.iter().any(|root| path.starts_with(root))
}

fn is_symlink(path: &Path) -> bool {
    fs::symlink_metadata(path)
        .map(|meta| meta.file_type().is_symlink())
        .unwrap_or(false)
}

fn file_signature(path: &Path) -> Option<(u64, std::time::SystemTime)> {
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() {
        return None;
    }
    let modified = meta.modified().ok()?;
    Some((meta.len(), modified))
}

#[derive(Debug)]
struct PendingEntry {
    last_seen: Instant,
    last_sig: Option<(u64, std::time::SystemTime)>,
}

impl Default for PendingEntry {
    fn default() -> Self {
        Self {
            last_seen: Instant::now(),
            last_sig: None,
        }
    }
}

/// Check if a path is a session file we care about
fn is_session_file(path: &Path) -> bool {
    let ext = path.extension().and_then(|e| e.to_str());
    let path_str = path.to_string_lossy();

    // Codex logs: match anything under ~/.codex that looks like a log file.
    // Codex log files may have extensions like `.log`, `.log.1`, etc. so we can't rely solely on `Path::extension`.
    if path_str.contains(".codex") && path_str.contains(".log") {
        return true;
    }

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
    } else if path_str.contains(".codex") {
        "codex".to_string()
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

        // Codex logs
        assert!(is_session_file(&PathBuf::from(
            "/home/user/.codex/logs/codex-session.log"
        )));
        assert!(is_session_file(&PathBuf::from(
            "/home/user/.codex/logs/codex-session.log.1"
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
