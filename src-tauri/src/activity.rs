//! Capture activity + commit capture bundle APIs.
//!
//! Exposes minimal, UI-friendly aggregates so the frontend can stay simple.

use crate::DbState;
use serde::Serialize;
use sqlx::Row;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub id: i64,
    pub created_at_iso: String,
    pub source_tool: String,
    pub action: String,
    pub status: String,
    pub session_id: Option<String>,
    pub commit_shas: Option<Vec<String>>,
    pub redaction_count: Option<i64>,
    pub needs_review: Option<bool>,
    pub message: String,
}

fn confidence_label(confidence: f64) -> &'static str {
    if confidence >= 0.8 {
        "High confidence"
    } else if confidence >= 0.6 {
        "Medium confidence"
    } else {
        "Low confidence"
    }
}

fn short_sha(sha: &str) -> String {
    sha.chars().take(7).collect()
}

fn tool_label(tool: &str) -> String {
    // keep UI consistent with existing tool labels
    match tool {
        "claude_code" => "Claude".to_string(),
        "cursor" => "Cursor".to_string(),
        "codex" => "Codex".to_string(),
        "codex_otlp" => "Codex".to_string(),
        other => {
            let mut c = other.replace('_', " ").replace('-', " ");
            if let Some(r) = c.get_mut(0..1) {
                r.make_ascii_uppercase();
            }
            c
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitCaptureBundle {
    pub commit_sha: String,
    pub linked_sessions: Vec<LinkedSession>,
    pub git_files_changed_top: Vec<String>,
    pub tools_used_top: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedSession {
    pub session_id: String,
    pub tool: String,
    pub model: Option<String>,
    pub imported_at_iso: String,
    pub duration_min: Option<i64>,
    pub message_count: i64,
    pub files_touched: Vec<String>,
    pub link_confidence: f64,
    pub needs_review: bool,
    pub auto_linked: bool,
    pub messages: Vec<LinkedSessionMessage>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedSessionMessage {
    pub role: String,
    pub text: String,
    pub tool_name: Option<String>,
}

fn parse_tool_names_from_trace(raw_json: &str) -> Vec<String> {
    // raw_json is stored as SessionTrace { messages: [...] }.
    // We treat tool calls as:
    // { "role": "tool_call", "tool_name": "...", ... } (per our internal enum tagging),
    // but we also allow best-effort parsing.
    let Ok(v) = serde_json::from_str::<serde_json::Value>(raw_json) else {
        return vec![];
    };
    let Some(msgs) = v.get("messages").and_then(|m| m.as_array()) else {
        return vec![];
    };

    let mut out = Vec::new();
    for m in msgs {
        let role = m.get("role").and_then(|r| r.as_str()).unwrap_or("");
        if role == "tool_call" {
            if let Some(name) = m.get("tool_name").and_then(|n| n.as_str()) {
                out.push(name.to_string());
            }
        }
    }
    out.sort();
    out.dedup();
    out
}

fn parse_messages_lite(raw_json: &str, limit: usize) -> Vec<LinkedSessionMessage> {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(raw_json) else {
        return vec![];
    };
    let Some(msgs) = v.get("messages").and_then(|m| m.as_array()) else {
        return vec![];
    };

    let mut out = Vec::new();
    for m in msgs.iter().take(limit) {
        let role = m.get("role").and_then(|r| r.as_str()).unwrap_or("unknown");
        let tool_name = m.get("tool_name").and_then(|t| t.as_str()).map(|s| s.to_string());

        // Text field differs by variant; we store `text` for user/assistant/thinking/plan.
        // Some tool/adapter variants may use `content` or `input`.
        let text = m
            .get("text")
            .and_then(|t| t.as_str())
            .map(|s| s.to_string())
            .or_else(|| m.get("content").and_then(|t| t.as_str()).map(|s| s.to_string()))
            .or_else(|| m.get("input").and_then(|t| t.as_str()).map(|s| s.to_string()))
            .unwrap_or_default();

        out.push(LinkedSessionMessage {
            role: role.to_string(),
            text,
            tool_name,
        });
    }
    out
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_ingest_activity(
    db: State<'_, DbState>,
    repo_id: i64,
    limit: i64,
) -> Result<Vec<ActivityEvent>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, source_tool, source_path, session_id, action, status, redaction_count, error_message, created_at
        FROM ingest_audit_log
        WHERE repo_id = ?
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ?
        "#,
    )
    .bind(repo_id)
    .bind(limit.max(1))
    .fetch_all(&*db.0)
    .await
    .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for row in rows {
        let id: i64 = row.get("id");
        let source_tool: String = row.get("source_tool");
        let source_path: Option<String> = row.try_get("source_path").ok();
        let session_id: Option<String> = row.try_get("session_id").ok();
        let action: String = row.get("action");
        let status: String = row.get("status");
        let redaction_count: Option<i64> = row.try_get("redaction_count").ok();
        let error_message: Option<String> = row.try_get("error_message").ok();
        let created_at: String = row.get("created_at");

        let mut commit_shas: Option<Vec<String>> = None;
        let mut needs_review: Option<bool> = None;
        let mut message = String::new();

        if action == "auto_import" {
            if let Some(sid) = session_id.as_deref() {
                if let Ok(link_row) = sqlx::query(
                    r#"
                    SELECT commit_sha, confidence, needs_review
                    FROM session_links
                    WHERE repo_id = ? AND session_id = ?
                    LIMIT 1
                    "#,
                )
                .bind(repo_id)
                .bind(sid)
                .fetch_one(&*db.0)
                .await
                {
                    let commit_sha: String = link_row.get("commit_sha");
                    let confidence: f64 = link_row.get("confidence");
                    let nr: i64 = link_row.try_get("needs_review").unwrap_or(0);
                    needs_review = Some(nr != 0);
                    commit_shas = Some(vec![commit_sha.clone()]);

                    if status == "imported" {
                        message = format!(
                            "Imported {} session → linked to {} ({}){}",
                            tool_label(&source_tool),
                            short_sha(&commit_sha),
                            confidence_label(confidence),
                            if nr != 0 { " · Needs review" } else { "" }
                        );
                    }
                }
            }

            if message.is_empty() {
                match status.as_str() {
                    "imported" => {
                        message = format!(
                            "Imported {} session{}",
                            tool_label(&source_tool),
                            redaction_count
                                .filter(|c| *c > 0)
                                .map(|c| format!(" (redactions: {c})"))
                                .unwrap_or_default()
                        );
                    }
                    "skipped" => message = format!("Skipped duplicate {} session", tool_label(&source_tool)),
                    "failed" => {
                        let err = error_message
                            .as_deref()
                            .unwrap_or("Unknown error")
                            .lines()
                            .next()
                            .unwrap_or("Unknown error");
                        message = format!("Failed to import {} session · {err}", tool_label(&source_tool));
                    }
                    _ => message = format!("{} session ingest: {status}", tool_label(&source_tool)),
                }
            }
        } else if action == "otlp_ingest" {
            // Parse JSON-ish error_message payload for commitShas/counts
            if let Some(raw) = error_message.as_deref() {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(raw) {
                    if let Some(shas) = v.get("commitShas").and_then(|s| s.as_array()) {
                        let parsed = shas
                            .iter()
                            .filter_map(|x| x.as_str().map(|s| s.to_string()))
                            .collect::<Vec<_>>();
                        if !parsed.is_empty() {
                            commit_shas = Some(parsed);
                        }
                    }
                }
            }

            if status == "imported" {
                let n = commit_shas.as_ref().map(|c| c.len()).unwrap_or(0);
                message = format!("Captured Codex trace → updated {n} commit(s)");
            } else {
                let err = error_message
                    .as_deref()
                    .unwrap_or("Unknown error")
                    .lines()
                    .next()
                    .unwrap_or("Unknown error");
                message = format!("Codex trace ingest failed · {err}");
            }
        } else {
            message = format!("{action}: {status}");
        }

        // best-effort commit shas from source_path for session imports if absent
        if commit_shas.is_none() && action == "auto_import" {
            if let Some(path) = source_path {
                if path.contains(".agent-trace") {
                    commit_shas = None;
                }
            }
        }

        out.push(ActivityEvent {
            id,
            created_at_iso: created_at,
            source_tool: source_tool.clone(),
            action,
            status,
            session_id,
            commit_shas,
            redaction_count,
            needs_review,
            message,
        });
    }

    Ok(out)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_commit_capture_bundle(
    db: State<'_, DbState>,
    repo_id: i64,
    repo_root: String,
    commit_sha: String,
) -> Result<CommitCaptureBundle, String> {
    // Linked sessions
    let rows = sqlx::query(
        r#"
        SELECT
          l.session_id as session_id,
          l.confidence as confidence,
          l.auto_linked as auto_linked,
          l.needs_review as needs_review,
          s.tool as tool,
          s.model as model,
          s.imported_at as imported_at,
          s.duration_min as duration_min,
          s.message_count as message_count,
          s.files as files_json,
          s.raw_json as raw_json
        FROM session_links l
        JOIN sessions s ON s.id = l.session_id
        WHERE l.repo_id = ? AND l.commit_sha = ?
        ORDER BY datetime(s.imported_at) DESC
        "#,
    )
    .bind(repo_id)
    .bind(&commit_sha)
    .fetch_all(&*db.0)
    .await
    .map_err(|e| e.to_string())?;

    let mut linked_sessions = Vec::new();
    let mut tools_used = Vec::<String>::new();

    for row in rows {
        let sid: String = row.get("session_id");
        let tool: String = row.get("tool");
        let model: Option<String> = row.try_get("model").ok();
        let imported_at: String = row.get("imported_at");
        let duration_min: Option<i64> = row.try_get("duration_min").ok();
        let message_count: i64 = row.try_get("message_count").unwrap_or(0);
        let files_json: Option<String> = row.try_get("files_json").ok();
        let raw_json: String = row.get("raw_json");

        let confidence: f64 = row.get("confidence");
        let auto_linked: i64 = row.try_get("auto_linked").unwrap_or(1);
        let needs_review_i: i64 = row.try_get("needs_review").unwrap_or(0);

        let files_touched = files_json
            .and_then(|j| serde_json::from_str::<Vec<String>>(&j).ok())
            .unwrap_or_default();

        let tool_names = parse_tool_names_from_trace(&raw_json);
        tools_used.extend(tool_names);

        linked_sessions.push(LinkedSession {
            session_id: sid,
            tool,
            model,
            imported_at_iso: imported_at,
            duration_min,
            message_count,
            files_touched,
            link_confidence: confidence,
            needs_review: needs_review_i != 0,
            auto_linked: auto_linked != 0,
            messages: parse_messages_lite(&raw_json, 80),
        });
    }

    tools_used.sort();
    tools_used.dedup();

    // Git top changed files
    let file_rows = sqlx::query(
        r#"
        SELECT path
        FROM file_changes
        WHERE repo_id = ? AND commit_sha = ?
        ORDER BY (additions + deletions) DESC
        LIMIT 5
        "#,
    )
    .bind(repo_id)
    .bind(&commit_sha)
    .fetch_all(&*db.0)
    .await
    .map_err(|e| e.to_string())?;

    let git_files_changed_top = file_rows
        .into_iter()
        .filter_map(|r| r.try_get::<String, _>("path").ok())
        .collect::<Vec<_>>();

    // repo_root currently unused; keep in signature for future trace lookup / disk fallbacks
    let _ = repo_root;

    Ok(CommitCaptureBundle {
        commit_sha,
        linked_sessions,
        git_files_changed_top,
        tools_used_top: tools_used.into_iter().take(5).collect(),
    })
}
