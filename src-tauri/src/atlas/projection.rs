use crate::import::parser::SessionTrace;
use sqlx::{Row, SqlitePool};

use super::chunking::{derive_chunks, DeriveSummary};
use super::types::ATLAS_DERIVED_VERSION;

#[derive(Debug, Clone, Default)]
pub struct UpsertProjectionSummary {
    pub chunks_written: i64,
    pub truncated: bool,
}

pub async fn upsert_chunks_for_session(
    db: &SqlitePool,
    repo_id: i64,
    session_id: &str,
    raw_json: &str,
) -> Result<UpsertProjectionSummary, String> {
    let imported_at = fetch_session_imported_at(db, repo_id, session_id)
        .await
        .ok()
        .flatten();

    let trace = serde_json::from_str::<SessionTrace>(raw_json).unwrap_or_default();
    let DeriveSummary { chunks, truncated } = derive_chunks(repo_id, session_id, &trace.messages);

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // Always delete-and-replace for determinism across redaction/projection changes.
    sqlx::query(
        r#"
        DELETE FROM atlas_chunks
        WHERE repo_id = ? AND session_id = ?
        "#,
    )
    .bind(repo_id)
    .bind(session_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    for chunk in &chunks {
        sqlx::query(
            r#"
            INSERT INTO atlas_chunks (
              chunk_uid,
              repo_id,
              session_id,
              chunk_index,
              start_message_index,
              end_message_index,
              role_mask,
              text,
              session_imported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&chunk.chunk_uid)
        .bind(repo_id)
        .bind(session_id)
        .bind(chunk.chunk_index)
        .bind(chunk.start_message_index)
        .bind(chunk.end_message_index)
        .bind(&chunk.role_mask)
        .bind(&chunk.text)
        .bind(&imported_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    // Best-effort: refresh per-repo state counts
    let _ = refresh_index_state_counts(db, repo_id, None).await;

    Ok(UpsertProjectionSummary {
        chunks_written: chunks.len() as i64,
        truncated,
    })
}

pub async fn delete_chunks_for_repo(db: &SqlitePool, repo_id: i64) -> Result<u64, String> {
    let result = sqlx::query(
        r#"
        DELETE FROM atlas_chunks
        WHERE repo_id = ?
        "#,
    )
    .bind(repo_id)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    let _ = refresh_index_state_counts(db, repo_id, Some("rebuild")).await;

    Ok(result.rows_affected())
}

pub async fn refresh_index_state_counts(
    db: &SqlitePool,
    repo_id: i64,
    reason: Option<&str>,
) -> Result<(), String> {
    let row = sqlx::query(
        r#"
        SELECT
          COUNT(DISTINCT session_id) AS sessions_indexed,
          COUNT(*) AS chunks_indexed
        FROM atlas_chunks
        WHERE repo_id = ?
        "#,
    )
    .bind(repo_id)
    .fetch_one(db)
    .await
    .map_err(|e| e.to_string())?;

    let sessions_indexed: i64 = row.try_get("sessions_indexed").unwrap_or(0);
    let chunks_indexed: i64 = row.try_get("chunks_indexed").unwrap_or(0);

    let last_rebuild_at = if reason == Some("rebuild") {
        Some("CURRENT_TIMESTAMP")
    } else {
        None
    };

    // sqlite doesn't allow binding expressions for CURRENT_TIMESTAMP; so use two query variants.
    if last_rebuild_at.is_some() {
        sqlx::query(
            r#"
            INSERT INTO atlas_index_state (
              repo_id,
              derived_version,
              last_rebuild_at,
              last_updated_at,
              last_error,
              sessions_indexed,
              chunks_indexed,
              updated_at
            )
            VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(repo_id) DO UPDATE SET
              derived_version = excluded.derived_version,
              last_rebuild_at = excluded.last_rebuild_at,
              last_updated_at = excluded.last_updated_at,
              last_error = NULL,
              sessions_indexed = excluded.sessions_indexed,
              chunks_indexed = excluded.chunks_indexed,
              updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(repo_id)
        .bind(ATLAS_DERIVED_VERSION)
        .bind(sessions_indexed)
        .bind(chunks_indexed)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        sqlx::query(
            r#"
            INSERT INTO atlas_index_state (
              repo_id,
              derived_version,
              last_updated_at,
              last_error,
              sessions_indexed,
              chunks_indexed,
              updated_at
            )
            VALUES (?, ?, CURRENT_TIMESTAMP, NULL, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(repo_id) DO UPDATE SET
              derived_version = excluded.derived_version,
              last_updated_at = excluded.last_updated_at,
              last_error = NULL,
              sessions_indexed = excluded.sessions_indexed,
              chunks_indexed = excluded.chunks_indexed,
              updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(repo_id)
        .bind(ATLAS_DERIVED_VERSION)
        .bind(sessions_indexed)
        .bind(chunks_indexed)
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

pub async fn mark_index_error(db: &SqlitePool, repo_id: i64, message: &str) {
    let _ = sqlx::query(
        r#"
        INSERT INTO atlas_index_state (repo_id, derived_version, last_error, last_updated_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(repo_id) DO UPDATE SET
          derived_version = excluded.derived_version,
          last_error = excluded.last_error,
          last_updated_at = excluded.last_updated_at,
          updated_at = CURRENT_TIMESTAMP
        "#,
    )
    .bind(repo_id)
    .bind(ATLAS_DERIVED_VERSION)
    .bind(message)
    .execute(db)
    .await;
}

async fn fetch_session_imported_at(
    db: &SqlitePool,
    repo_id: i64,
    session_id: &str,
) -> Result<Option<String>, String> {
    let imported_at: Option<String> = sqlx::query_scalar(
        r#"
        SELECT imported_at
        FROM sessions
        WHERE repo_id = ? AND id = ?
        LIMIT 1
        "#,
    )
    .bind(repo_id)
    .bind(session_id)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(imported_at)
}
