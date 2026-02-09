//! Import/export commit↔session Story Anchor notes.

use crate::attribution::utils::fetch_repo_root;
use crate::story_anchors::notes_format::compute_note_hash;
use crate::story_anchors::refs::{SESSIONS_REF_CANONICAL, SESSIONS_SCHEMA_VERSION};
use crate::story_anchors::sessions_notes::{build_sessions_note, parse_sessions_note, SessionHint};
use git2::{Oid, Repository, Signature};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionsNoteImportSummary {
    pub commit_sha: String,
    pub status: String,
    pub imported_sessions: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionsNoteBatchSummary {
    pub total: u32,
    pub imported: u32,
    pub missing: u32,
    pub failed: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionsNoteExportSummary {
    pub commit_sha: String,
    pub status: String,
}

const REWRITE_KEY_ALGORITHM: &str = "patch-id";

pub async fn import_sessions_note(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<SessionsNoteImportSummary, String> {
    let repo_root = fetch_repo_root(db, repo_id).await?;

    let note_result: Result<Option<(String, String)>, String> = {
        let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
        let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;
        let out = match repo.find_note(Some(SESSIONS_REF_CANONICAL), oid) {
            Ok(note) => {
                let msg = note
                    .message()
                    .ok_or_else(|| "Sessions note is not valid UTF-8".to_string())?
                    .to_string();
                Ok(Some((msg, SESSIONS_REF_CANONICAL.to_string())))
            }
            Err(_) => Ok(None),
        };
        out
    };

    let Some((message, note_ref)) = note_result? else {
        // Clear cached note meta and links (notes are authoritative for this table)
        let _ = sqlx::query(
            r#"
            DELETE FROM story_anchor_note_meta
            WHERE repo_id = ? AND commit_sha = ? AND note_kind = 'sessions'
            "#,
        )
        .bind(repo_id)
        .bind(commit_sha)
        .execute(db)
        .await;

        let _ = sqlx::query(
            r#"
            DELETE FROM commit_session_links
            WHERE repo_id = ? AND commit_sha = ? AND source = 'notes'
            "#,
        )
        .bind(repo_id)
        .bind(commit_sha)
        .execute(db)
        .await;

        return Ok(SessionsNoteImportSummary {
            commit_sha: commit_sha.to_string(),
            status: "missing".to_string(),
            imported_sessions: 0,
        });
    };

    let parsed = parse_sessions_note(&message);
    let note_hash = compute_note_hash(&message);

    // Store note meta
    sqlx::query(
        r#"
        INSERT INTO story_anchor_note_meta (repo_id, commit_sha, note_kind, note_ref, note_hash, schema_version)
        VALUES (?, ?, 'sessions', ?, ?, ?)
        ON CONFLICT(repo_id, commit_sha, note_kind, note_ref) DO UPDATE SET
            note_hash = excluded.note_hash,
            schema_version = excluded.schema_version,
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .bind(&note_ref)
    .bind(&note_hash)
    .bind(parsed.schema_version.clone().or(Some(SESSIONS_SCHEMA_VERSION.to_string())))
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    // Replace notes-sourced links for this commit
    sqlx::query(
        r#"
        DELETE FROM commit_session_links
        WHERE repo_id = ? AND commit_sha = ? AND source = 'notes'
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    for session_id in &parsed.session_ids {
        sqlx::query(
            r#"
            INSERT INTO commit_session_links (repo_id, commit_sha, session_id, source, confidence)
            VALUES (?, ?, ?, 'notes', NULL)
            ON CONFLICT(repo_id, commit_sha, session_id) DO UPDATE SET
                source = 'notes',
                updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(repo_id)
        .bind(commit_sha)
        .bind(session_id)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(SessionsNoteImportSummary {
        commit_sha: commit_sha.to_string(),
        status: "imported".to_string(),
        imported_sessions: parsed.session_ids.len() as u32,
    })
}

pub async fn import_sessions_notes_batch(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_shas: Vec<String>,
) -> Result<SessionsNoteBatchSummary, String> {
    let mut imported = 0;
    let mut missing = 0;
    let mut failed = 0;

    for sha in commit_shas {
        match import_sessions_note(db, repo_id, &sha).await {
            Ok(sum) => {
                if sum.status == "imported" {
                    imported += 1;
                } else {
                    missing += 1;
                }
            }
            Err(_) => failed += 1,
        }
    }

    Ok(SessionsNoteBatchSummary {
        total: (imported + missing + failed) as u32,
        imported: imported as u32,
        missing: missing as u32,
        failed: failed as u32,
    })
}

pub async fn export_sessions_note(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<SessionsNoteExportSummary, String> {
    use crate::attribution::git_utils::compute_rewrite_key;

    // Pull sessions for this commit from notes-sourced links first; fallback to heuristic session_links.
    let mut session_ids: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT session_id
        FROM commit_session_links
        WHERE repo_id = ? AND commit_sha = ?
        ORDER BY session_id
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_all(db)
    .await
    .unwrap_or_default();

    if session_ids.is_empty() {
        session_ids = sqlx::query_scalar(
            r#"
            SELECT session_id
            FROM session_links
            WHERE repo_id = ? AND commit_sha = ?
            ORDER BY session_id
            "#,
        )
        .bind(repo_id)
        .bind(commit_sha)
        .fetch_all(db)
        .await
        .unwrap_or_default();
    }

    if session_ids.is_empty() {
        return Ok(SessionsNoteExportSummary {
            commit_sha: commit_sha.to_string(),
            status: "empty".to_string(),
        });
    }

    let repo_root = fetch_repo_root(db, repo_id).await?;
    let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
    let rewrite_key = compute_rewrite_key(&repo, commit_sha).ok();

    // Optional-but-implemented: include minimal session hints (tool/model/imported_at).
    let mut session_hints: Vec<SessionHint> = Vec::new();
    for sid in &session_ids {
        if let Ok(Some((tool, model, imported_at))) =
            sqlx::query_as::<_, (String, Option<String>, String)>(
                r#"
            SELECT tool, model, imported_at
            FROM sessions
            WHERE repo_id = ? AND id = ?
            "#,
            )
            .bind(repo_id)
            .bind(sid)
            .fetch_optional(db)
            .await
        {
            session_hints.push(SessionHint {
                session_id: sid.clone(),
                tool: Some(tool),
                model,
                imported_at_iso: Some(imported_at),
            });
        }
    }
    if session_hints.is_empty() {
        // Ensure we don't serialize an empty array (keeps notes smaller).
        session_hints = Vec::new();
    }

    let note_text = build_sessions_note(
        commit_sha,
        &session_ids,
        (!session_hints.is_empty()).then_some(session_hints),
        rewrite_key.as_deref(),
        Some(REWRITE_KEY_ALGORITHM),
    );

    let note_hash = compute_note_hash(&note_text);

    let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;
    {
        let signature = repo
            .signature()
            .or_else(|_| Signature::now("Narrative", "narrative@local"))
            .map_err(|e| e.to_string())?;

        repo.note(
            &signature,
            &signature,
            Some(SESSIONS_REF_CANONICAL),
            oid,
            &note_text,
            true,
        )
        .map_err(|e| e.to_string())?;
        // signature dropped here (git2 types are not Send across await)
    }
    drop(repo);

    // Track note meta
    sqlx::query(
        r#"
        INSERT INTO story_anchor_note_meta (repo_id, commit_sha, note_kind, note_ref, note_hash, schema_version)
        VALUES (?, ?, 'sessions', ?, ?, ?)
        ON CONFLICT(repo_id, commit_sha, note_kind, note_ref) DO UPDATE SET
            note_hash = excluded.note_hash,
            schema_version = excluded.schema_version,
            updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .bind(SESSIONS_REF_CANONICAL)
    .bind(note_hash)
    .bind(SESSIONS_SCHEMA_VERSION)
    .execute(db)
    .await
    .ok();

    Ok(SessionsNoteExportSummary {
        commit_sha: commit_sha.to_string(),
        status: "exported".to_string(),
    })
}
