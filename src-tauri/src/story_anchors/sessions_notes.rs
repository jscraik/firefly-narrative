//! Story Anchor: commit↔session links stored in Git Notes.

use crate::story_anchors::notes_format::{split_note_sections, NOTE_DIVIDER};
use crate::story_anchors::refs::SESSIONS_SCHEMA_VERSION;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default)]
pub struct ParsedSessionsNote {
    pub session_ids: Vec<String>,
    pub session_hints: Vec<SessionHint>,
    pub schema_version: Option<String>,
    pub rewrite_key: Option<String>,
    pub rewrite_algorithm: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionHint {
    pub session_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub imported_at_iso: Option<String>,
}

#[derive(Debug, Serialize)]
struct SessionsNotePayload {
    #[serde(rename = "schema_version")]
    schema_version: String,
    #[serde(rename = "base_commit_sha")]
    base_commit_sha: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    rewrite_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    rewrite_algorithm: Option<String>,
    session_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_hints: Option<Vec<SessionHint>>,
}

#[derive(Debug, Deserialize)]
struct SessionsNotePayloadIn {
    #[serde(rename = "schema_version")]
    schema_version: Option<String>,
    #[serde(rename = "base_commit_sha")]
    #[allow(dead_code)]
    base_commit_sha: Option<String>,
    rewrite_key: Option<String>,
    rewrite_algorithm: Option<String>,
    session_ids: Option<Vec<String>>,
    session_hints: Option<Vec<SessionHint>>,
}

pub fn parse_sessions_note(message: &str) -> ParsedSessionsNote {
    let (fast, json) = split_note_sections(message);

    let mut session_ids: Vec<String> = fast
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .map(|l| l.to_string())
        .collect();

    let mut schema_version: Option<String> = None;
    let mut rewrite_key: Option<String> = None;
    let mut rewrite_algorithm: Option<String> = None;
    let mut session_hints: Vec<SessionHint> = Vec::new();

    if !json.is_empty() {
        if let Ok(payload) = serde_json::from_str::<SessionsNotePayloadIn>(&json) {
            schema_version = payload.schema_version;
            rewrite_key = payload.rewrite_key;
            rewrite_algorithm = payload.rewrite_algorithm;
            if let Some(ids) = payload.session_ids {
                session_ids = ids;
            }
            if let Some(hints) = payload.session_hints {
                session_hints = hints;
            }
        }
    }

    // Normalize ordering for determinism
    session_ids.sort();
    session_ids.dedup();

    ParsedSessionsNote {
        session_ids,
        session_hints,
        schema_version,
        rewrite_key,
        rewrite_algorithm,
    }
}

pub fn build_sessions_note(
    commit_sha: &str,
    session_ids: &[String],
    session_hints: Option<Vec<SessionHint>>,
    rewrite_key: Option<&str>,
    rewrite_algorithm: Option<&str>,
) -> String {
    let mut ids = session_ids.to_vec();
    ids.sort();
    ids.dedup();

    let mut lines: Vec<String> = Vec::new();
    for id in &ids {
        lines.push(id.clone());
    }

    let payload = SessionsNotePayload {
        schema_version: SESSIONS_SCHEMA_VERSION.to_string(),
        base_commit_sha: commit_sha.to_string(),
        rewrite_key: rewrite_key.map(|v| v.to_string()),
        rewrite_algorithm: rewrite_algorithm.map(|v| v.to_string()),
        session_ids: ids,
        session_hints,
    };

    let json = serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".to_string());
    lines.push(NOTE_DIVIDER.to_string());
    lines.push(json);
    lines.join("\n")
}
