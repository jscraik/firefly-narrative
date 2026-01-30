//! Tauri commands for session import

use super::{
    parser::{ParseError, ParseResult, ParsedSession, WarningSeverity},
    ParserRegistry,
};
use crate::DbState;
use sqlx::FromRow;
use tauri::State;

/// Result of importing a single session
#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportSuccess {
    pub path: String,
    pub session_id: String,
    pub warnings: Vec<String>,
}

/// Result of a failed import
#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportFailure {
    pub path: String,
    pub error: String,
    /// Whether the error is retryable (e.g., network issue)
    pub retryable: bool,
}

/// Result of a batch import operation
#[derive(Debug, Clone, serde::Serialize)]
pub struct BatchImportResult {
    pub total: usize,
    pub succeeded: Vec<ImportSuccess>,
    pub failed: Vec<ImportFailure>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMessagePayload {
    pub id: String,
    pub role: SessionMessageRolePayload,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionMessageRolePayload {
    User,
    Assistant,
    Thinking,
    Plan,
    ToolCall,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionExcerptPayload {
    pub id: String,
    pub tool: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_min: Option<i64>,
    pub messages: Vec<SessionMessagePayload>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub linked_commit_sha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub link_confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_linked: Option<bool>,
}

#[derive(Debug, FromRow)]
struct SessionRow {
    id: String,
    tool: String,
    duration_min: Option<i64>,
    raw_json: String,
    commit_sha: Option<String>,
    confidence: Option<f64>,
    auto_linked: Option<i64>,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_recent_sessions(
    db: State<'_, DbState>,
    repo_id: i64,
    limit: Option<i64>,
) -> Result<Vec<SessionExcerptPayload>, String> {
    use super::parser::{SessionTrace, TraceMessage};

    let limit = limit.unwrap_or(1).clamp(1, 10);
    let rows = sqlx::query_as::<_, SessionRow>(
        r#"
        SELECT s.id, s.tool, s.duration_min, s.raw_json,
               l.commit_sha, l.confidence, l.auto_linked
        FROM sessions s
        LEFT JOIN session_links l
          ON l.repo_id = s.repo_id AND l.session_id = s.id
        WHERE s.repo_id = ?
        ORDER BY s.imported_at DESC
        LIMIT ?
        "#,
    )
    .bind(repo_id)
    .bind(limit)
    .fetch_all(&*db.0)
    .await
    .map_err(|e| e.to_string())?;

    let payloads = rows
        .into_iter()
        .map(|row| {
            let trace = serde_json::from_str::<SessionTrace>(&row.raw_json).unwrap_or_default();
            let messages = trace
                .messages
                .iter()
                .enumerate()
                .map(|(idx, message)| match message {
                    TraceMessage::User { text, .. } => SessionMessagePayload {
                        id: format!("{}:m{}", row.id, idx),
                        role: SessionMessageRolePayload::User,
                        text: text.clone(),
                        files: None,
                        tool_name: None,
                        tool_input: None,
                    },
                    TraceMessage::Assistant { text, .. } => SessionMessagePayload {
                        id: format!("{}:m{}", row.id, idx),
                        role: SessionMessageRolePayload::Assistant,
                        text: text.clone(),
                        files: None,
                        tool_name: None,
                        tool_input: None,
                    },
                    TraceMessage::Thinking { text, .. } => SessionMessagePayload {
                        id: format!("{}:m{}", row.id, idx),
                        role: SessionMessageRolePayload::Thinking,
                        text: text.clone(),
                        files: None,
                        tool_name: None,
                        tool_input: None,
                    },
                    TraceMessage::Plan { text, .. } => SessionMessagePayload {
                        id: format!("{}:m{}", row.id, idx),
                        role: SessionMessageRolePayload::Plan,
                        text: text.clone(),
                        files: None,
                        tool_name: None,
                        tool_input: None,
                    },
                    TraceMessage::ToolCall {
                        tool_name, input, ..
                    } => {
                        let text = input
                            .as_ref()
                            .and_then(|value| {
                                if value.is_null() {
                                    None
                                } else {
                                    Some(value.to_string())
                                }
                            })
                            .unwrap_or_default();
                        SessionMessagePayload {
                            id: format!("{}:m{}", row.id, idx),
                            role: SessionMessageRolePayload::ToolCall,
                            text,
                            files: None,
                            tool_name: Some(tool_name.clone()),
                            tool_input: input.clone(),
                        }
                    }
                })
                .collect::<Vec<_>>();

            SessionExcerptPayload {
                id: row.id,
                tool: row.tool,
                duration_min: row.duration_min,
                messages,
                linked_commit_sha: row.commit_sha,
                link_confidence: row.confidence,
                auto_linked: row.auto_linked.map(|value| value != 0),
            }
        })
        .collect();

    Ok(payloads)
}

/// Import multiple session files
///
/// This command handles partial failures - successful imports are returned
/// even if some files fail. This is important for UX: we don't want one
/// corrupt file to prevent importing 50 valid sessions.
#[tauri::command(rename_all = "camelCase")]
pub async fn import_session_files(
    db: State<'_, DbState>,
    repo_id: i64,
    file_paths: Vec<String>,
) -> Result<BatchImportResult, String> {
    let registry = ParserRegistry::new();
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();
    let total = file_paths.len();

    for path_str in file_paths {
        let path = std::path::Path::new(&path_str);

        match registry.parse(path) {
            ParseResult::Success(session) => match store_session(&db.0, repo_id, &session).await {
                Ok(id) => {
                    log_import(&db.0, repo_id, &path_str, Some(&id), "success", None, None).await;
                    succeeded.push(ImportSuccess {
                        path: path_str,
                        session_id: id,
                        warnings: vec![],
                    });
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    log_import(
                        &db.0,
                        repo_id,
                        &path_str,
                        None,
                        "failed",
                        None,
                        Some(&error_msg),
                    )
                    .await;
                    failed.push(ImportFailure {
                        path: path_str,
                        error: error_msg,
                        retryable: true,
                    });
                }
            },
            ParseResult::Partial(session, warnings) => {
                // Check if any warnings are security-related
                let has_security = warnings
                    .iter()
                    .any(|w| matches!(w.severity, WarningSeverity::Security));

                if has_security {
                    // Security warnings require user confirmation
                    let warning_msgs: Vec<String> = warnings
                        .iter()
                        .filter(|w| matches!(w.severity, WarningSeverity::Security))
                        .map(|w| w.message.clone())
                        .collect();

                    let error_msg = format!(
                        "Security warnings detected: {}. User confirmation required.",
                        warning_msgs.join("; ")
                    );

                    log_import(
                        &db.0,
                        repo_id,
                        &path_str,
                        None,
                        "failed",
                        Some(&warning_msgs.join("\n")),
                        Some(&error_msg),
                    )
                    .await;

                    failed.push(ImportFailure {
                        path: path_str,
                        error: error_msg,
                        retryable: true, // Can retry after user confirmation
                    });
                    continue;
                }

                // Non-security warnings: store with warnings logged
                match store_session(&db.0, repo_id, &session).await {
                    Ok(id) => {
                        let warning_msgs: Vec<String> = warnings
                            .iter()
                            .map(|w| {
                                format!(
                                    "[{}] {}",
                                    match w.severity {
                                        WarningSeverity::Info => "INFO",
                                        WarningSeverity::Warning => "WARN",
                                        WarningSeverity::Security => "SEC",
                                    },
                                    w.message
                                )
                            })
                            .collect();

                        log_import(
                            &db.0,
                            repo_id,
                            &path_str,
                            Some(id.as_str()),
                            "partial",
                            Some(&warning_msgs.join("\n")),
                            None,
                        )
                        .await;

                        succeeded.push(ImportSuccess {
                            path: path_str,
                            session_id: id,
                            warnings: warning_msgs,
                        });
                    }
                    Err(e) => {
                        let error_msg = e.to_string();
                        log_import(
                            &db.0,
                            repo_id,
                            &path_str,
                            None,
                            "failed",
                            None,
                            Some(&error_msg),
                        )
                        .await;
                        failed.push(ImportFailure {
                            path: path_str,
                            error: error_msg,
                            retryable: true,
                        });
                    }
                }
            }
            ParseResult::Failure(e) => {
                let error_msg = e.to_string();
                let retryable = matches!(e, ParseError::Io(_));

                log_import(
                    &db.0,
                    repo_id,
                    &path_str,
                    None,
                    "failed",
                    None,
                    Some(&error_msg),
                )
                .await;

                failed.push(ImportFailure {
                    path: path_str,
                    error: error_msg,
                    retryable,
                });
            }
        }
    }

    Ok(BatchImportResult {
        total,
        succeeded,
        failed,
    })
}

/// Scan for available session files
///
/// Searches standard locations for AI session files without importing them.
#[tauri::command(rename_all = "camelCase")]
pub async fn scan_for_session_files() -> Result<Vec<ScannedSession>, String> {
    let mut results = Vec::new();

    // Scan Claude Code directories
    if let Some(home) = dirs::home_dir() {
        let claude_dir = home.join(".claude/projects");
        if claude_dir.exists() {
            scan_claude_directory(&claude_dir, &mut results).map_err(|e| e.to_string())?;
        }
    }

    Ok(results)
}

/// Import a single session file (convenience wrapper)
#[tauri::command(rename_all = "camelCase")]
pub async fn import_session_file(
    db: State<'_, DbState>,
    repo_id: i64,
    file_path: String,
) -> Result<BatchImportResult, String> {
    import_session_files(db, repo_id, vec![file_path]).await
}

/// A discovered session file
#[derive(Debug, Clone, serde::Serialize)]
pub struct ScannedSession {
    pub path: String,
    pub tool: String,
    pub detected_at: String,
}

/// Store a parsed session in the database
async fn store_session(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    session: &ParsedSession,
) -> Result<String, sqlx::Error> {
    use sqlx::query;

    // Generate deterministic session ID
    let session_id = generate_session_id(&session.origin);

    // Calculate session metadata
    let message_count = session.message_count() as i32;
    let duration_min = session.started_at.and_then(|start| {
        session
            .ended_at
            .map(|end| (end - start).num_minutes() as i32)
    });

    // Serialize trace to JSON
    let trace_json = serde_json::to_string(&session.trace).unwrap_or_else(|_| "{}".to_string());

    // Serialize files touched
    let files_json =
        serde_json::to_string(&session.files_touched).unwrap_or_else(|_| "[]".to_string());

    // Insert or update session (includes all fields from session_details)
    query(
        r#"
        INSERT INTO sessions (
            id,
            repo_id,
            tool,
            model,
            imported_at,
            duration_min,
            message_count,
            files,
            conversation_id,
            trace_available,
            raw_json
        )
        VALUES (?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
            imported_at = datetime('now'),
            model = COALESCE(excluded.model, sessions.model),
            duration_min = COALESCE(excluded.duration_min, sessions.duration_min),
            message_count = excluded.message_count,
            files = excluded.files,
            conversation_id = COALESCE(excluded.conversation_id, sessions.conversation_id),
            trace_available = MAX(excluded.trace_available, sessions.trace_available),
            raw_json = excluded.raw_json
        "#,
    )
    .bind(&session_id)
    .bind(repo_id)
    .bind(&session.origin.tool)
    .bind(&session.origin.model)
    .bind(duration_min)
    .bind(message_count)
    .bind(files_json)
    .bind(&session.origin.conversation_id)
    .bind(trace_json)
    .execute(db)
    .await?;

    Ok(session_id)
}

/// Log import attempt for audit/debugging
async fn log_import(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    file_path: &str,
    session_id: Option<&str>,
    status: &str,
    warnings: Option<&str>,
    error: Option<&str>,
) {
    let _ = sqlx::query(
        r#"
        INSERT INTO session_import_log (repo_id, file_path, session_id, status, warnings, error_message, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        "#
    )
    .bind(repo_id)
    .bind(file_path)
    .bind(session_id)
    .bind(status)
    .bind(warnings)
    .bind(error)
    .execute(db)
    .await;
}

/// Generate a deterministic session ID
fn generate_session_id(origin: &super::parser::SessionOrigin) -> String {
    use sha2::{Digest, Sha256};

    let input = format!("{}:{}", origin.tool, origin.session_id);
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();

    format!("{:x}", result)[..16].to_string()
}

/// Scan Claude Code directory recursively
fn scan_claude_directory(
    dir: &std::path::Path,
    results: &mut Vec<ScannedSession>,
) -> Result<(), std::io::Error> {
    use std::fs;

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Recurse into subdirectories
            scan_claude_directory(&path, results)?;
        } else if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
            results.push(ScannedSession {
                path: path.to_string_lossy().to_string(),
                tool: "claude_code".to_string(),
                detected_at: chrono::Utc::now().to_rfc3339(),
            });
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_session_id_deterministic() {
        let origin = super::super::parser::SessionOrigin {
            tool: "claude_code".to_string(),
            session_id: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            conversation_id: "conversation-1".to_string(),
            model: None,
        };

        let id1 = generate_session_id(&origin);
        let id2 = generate_session_id(&origin);

        assert_eq!(id1, id2);
        assert_eq!(id1.len(), 16);
    }

    #[test]
    fn test_generate_session_id_unique() {
        let origin1 = super::super::parser::SessionOrigin {
            tool: "claude_code".to_string(),
            session_id: "aaa".to_string(),
            conversation_id: "conversation-1".to_string(),
            model: None,
        };

        let origin2 = super::super::parser::SessionOrigin {
            tool: "cursor".to_string(),
            session_id: "aaa".to_string(),
            conversation_id: "conversation-2".to_string(),
            model: None,
        };

        let id1 = generate_session_id(&origin1);
        let id2 = generate_session_id(&origin2);

        assert_ne!(id1, id2);
    }
}
