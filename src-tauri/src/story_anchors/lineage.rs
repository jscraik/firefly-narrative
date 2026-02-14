//! Story Anchor: Lineage events.
//!
//! This is intentionally lightweight: we store lineage events in SQLite for observability,
//! and optionally attach a Git Note under refs/notes/narrative/lineage to HEAD after rewrites/merges.

use crate::attribution::utils::fetch_repo_root;
use crate::story_anchors::notes_format::{compute_note_hash, NOTE_DIVIDER};
use crate::story_anchors::refs::{LINEAGE_REF_CANONICAL, LINEAGE_SCHEMA_VERSION};
use git2::{Oid, Repository, Signature};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LineageEventPayload {
    pub schema_version: String,
    pub event_type: String,
    pub head_sha: Option<String>,
    pub rewritten_pairs: Vec<(String, String)>,
    pub rewrite_key_algorithm: String,
    pub timestamp_utc: String,
}

pub async fn record_lineage_event(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    event_type: &str,
    head_sha: Option<&str>,
    payload_json: &str,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO lineage_events (repo_id, event_type, head_sha, payload_json)
        VALUES (?, ?, ?, ?)
        "#,
    )
    .bind(repo_id)
    .bind(event_type)
    .bind(head_sha)
    .bind(payload_json)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn write_lineage_note_for_head(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    head_sha: &str,
    payload: &LineageEventPayload,
) -> Result<(), String> {
    let repo_root = fetch_repo_root(db, repo_id).await?;
    let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
    let oid = Oid::from_str(head_sha).map_err(|e| e.to_string())?;

    let mut lines: Vec<String> = Vec::new();
    lines.push(format!("event_type {}", payload.event_type));
    if let Some(head) = &payload.head_sha {
        lines.push(format!("head {}", head));
    }
    for (from, to) in payload.rewritten_pairs.iter().take(50) {
        lines.push(format!("rewrite {from} {to}"));
    }

    let json = serde_json::to_string_pretty(payload).unwrap_or_else(|_| "{}".to_string());
    lines.push(NOTE_DIVIDER.to_string());
    lines.push(json);
    let message = lines.join("\n");
    let note_hash = compute_note_hash(&message);

    let signature = repo
        .signature()
        .or_else(|_| Signature::now("Narrative", "narrative@local"))
        .map_err(|e| e.to_string())?;

    repo.note(
        &signature,
        &signature,
        Some(LINEAGE_REF_CANONICAL),
        oid,
        &message,
        true,
    )
    .map_err(|e| e.to_string())?;

    // Track note meta (best-effort)
    let _ = sqlx::query(
        r#"
        INSERT INTO story_anchor_note_meta (repo_id, commit_sha, note_kind, note_ref, note_hash, schema_version)
        VALUES (?, ?, 'lineage', ?, ?, ?)
        ON CONFLICT(repo_id, commit_sha, note_kind, note_ref) DO UPDATE SET
            note_hash = excluded.note_hash,
            schema_version = excluded.schema_version,
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(repo_id)
    .bind(head_sha)
    .bind(LINEAGE_REF_CANONICAL)
    .bind(note_hash)
    .bind(LINEAGE_SCHEMA_VERSION)
    .execute(db)
    .await;

    Ok(())
}
