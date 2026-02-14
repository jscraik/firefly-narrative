use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::State;

use crate::DbState;

use super::chunking::CHUNK_TEXT_MAX_CHARS;
use super::projection;
use super::types::{AtlasBudgets, AtlasEnvelope, AtlasErrorCode, AtlasMeta, ATLAS_DERIVED_VERSION};

const QUERY_MAX_CHARS: usize = 256;
const QUERY_MAX_TERMS: usize = 8;
const LIMIT_MAX: i64 = 50;
const SNIPPET_MAX_CHARS: usize = 240;
const GET_SESSION_MAX_CHUNKS: i64 = 25;
const SESSION_ID_MAX_CHARS: usize = 128;
const RESPONSE_MAX_CHARS: usize = 60_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasCapabilitiesResponse {
    pub derived_version: String,
    pub fts5_enabled: bool,
    pub fts_table_ready: bool,
    pub budgets: AtlasBudgets,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn atlas_capabilities(
    db: State<'_, DbState>,
) -> Result<AtlasEnvelope<AtlasCapabilitiesResponse>, String> {
    let pool = &*db.0;
    let fts5_enabled = detect_fts5(pool).await;
    let fts_table_ready = detect_fts_table(pool).await;

    Ok(AtlasEnvelope::ok(AtlasCapabilitiesResponse {
        derived_version: ATLAS_DERIVED_VERSION.to_string(),
        fts5_enabled,
        fts_table_ready,
        budgets: AtlasBudgets {
            query_max_chars: QUERY_MAX_CHARS as u32,
            query_max_terms: QUERY_MAX_TERMS as u32,
            limit_max: LIMIT_MAX as u32,
            snippet_max_chars: SNIPPET_MAX_CHARS as u32,
            chunk_text_max_chars: CHUNK_TEXT_MAX_CHARS as u32,
            get_session_max_chunks: GET_SESSION_MAX_CHUNKS as u32,
            response_max_chars: RESPONSE_MAX_CHARS as u32,
        },
    }))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasIndexState {
    pub repo_id: i64,
    pub derived_version: String,
    pub last_rebuild_at: Option<String>,
    pub last_updated_at: Option<String>,
    pub last_error: Option<String>,
    pub sessions_indexed: i64,
    pub chunks_indexed: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasIntrospectResponse {
    pub state: AtlasIndexState,
    pub chunks_in_table: i64,
    pub sessions_with_chunks: i64,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn atlas_introspect(
    db: State<'_, DbState>,
    repo_id: i64,
) -> Result<AtlasEnvelope<AtlasIntrospectResponse>, String> {
    let pool = &*db.0;

    // Ensure repo exists (expected failure should be envelope)
    if !repo_exists(pool, repo_id).await {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::RepoNotFound,
            "Unknown repoId",
        ));
    }

    let state = fetch_index_state(pool, repo_id)
        .await
        .unwrap_or_else(|| AtlasIndexState {
            repo_id,
            derived_version: ATLAS_DERIVED_VERSION.to_string(),
            last_rebuild_at: None,
            last_updated_at: None,
            last_error: None,
            sessions_indexed: 0,
            chunks_indexed: 0,
        });

    let chunks_in_table: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM atlas_chunks
        WHERE repo_id = ?
        "#,
    )
    .bind(repo_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let sessions_with_chunks: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT session_id)
        FROM atlas_chunks
        WHERE repo_id = ?
        "#,
    )
    .bind(repo_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    Ok(AtlasEnvelope::ok(AtlasIntrospectResponse {
        state,
        chunks_in_table,
        sessions_with_chunks,
    }))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSearchRequest {
    pub repo_id: i64,
    pub query: String,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSearchResult {
    pub chunk_uid: String,
    pub session_id: String,
    pub chunk_index: i64,
    pub score: f64,
    pub snippet: String,
    pub session_imported_at: Option<String>,
    pub session_tool: Option<String>,
    pub session_model: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSearchResponse {
    pub results: Vec<AtlasSearchResult>,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn atlas_search(
    db: State<'_, DbState>,
    request: AtlasSearchRequest,
) -> Result<AtlasEnvelope<AtlasSearchResponse>, String> {
    let pool = &*db.0;

    if !repo_exists(pool, request.repo_id).await {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::RepoNotFound,
            "Unknown repoId",
        ));
    }

    if request.query.chars().count() > QUERY_MAX_CHARS {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::BudgetQueryTooLong,
            format!("Query too long (max {QUERY_MAX_CHARS} chars)"),
        ));
    }

    let limit = match request.limit {
        None => 10,
        Some(v) if v <= 0 => 10,
        Some(v) if v > LIMIT_MAX => {
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::BudgetLimitTooHigh,
                format!("Limit too high (max {LIMIT_MAX})"),
            ));
        }
        Some(v) => v,
    };

    let fts_table_ready = detect_fts_table(pool).await;
    if !fts_table_ready {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::FtsNotAvailable,
            "FTS index not available in this database build",
        ));
    }

    let match_query = match build_match_query(&request.query) {
        Ok(v) => v,
        Err(code) => {
            return Ok(AtlasEnvelope::err(code, "Invalid query"));
        }
    };

    #[derive(sqlx::FromRow)]
    struct SearchRow {
        chunk_uid: String,
        session_id: String,
        chunk_index: i64,
        score: f64,
        snippet: String,
        session_imported_at: Option<String>,
        session_tool: Option<String>,
        session_model: Option<String>,
    }

    let rows = sqlx::query_as::<_, SearchRow>(
        r#"
        SELECT
          c.chunk_uid AS chunk_uid,
          c.session_id AS session_id,
          c.chunk_index AS chunk_index,
          bm25(atlas_chunks_fts) AS score,
          snippet(atlas_chunks_fts, 0, '', '', '…', 8) AS snippet,
          c.session_imported_at AS session_imported_at,
          s.tool AS session_tool,
          s.model AS session_model
        FROM atlas_chunks_fts
        JOIN atlas_chunks c ON c.id = atlas_chunks_fts.rowid
        LEFT JOIN sessions s ON s.repo_id = c.repo_id AND s.id = c.session_id
        WHERE c.repo_id = ? AND atlas_chunks_fts MATCH ?
        ORDER BY score ASC, c.session_imported_at DESC, c.chunk_uid ASC
        LIMIT ?
        "#,
    )
    .bind(request.repo_id)
    .bind(&match_query)
    .bind(limit)
    .fetch_all(pool)
    .await;

    let rows = match rows {
        Ok(v) => v,
        Err(err) => {
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::Internal,
                format!("Search failed: {err}"),
            ));
        }
    };

    let mut results: Vec<AtlasSearchResult> = rows
        .into_iter()
        .map(|row| AtlasSearchResult {
            chunk_uid: row.chunk_uid,
            session_id: row.session_id,
            chunk_index: row.chunk_index,
            score: row.score,
            snippet: truncate_chars(&row.snippet, SNIPPET_MAX_CHARS),
            session_imported_at: row.session_imported_at,
            session_tool: row.session_tool,
            session_model: row.session_model,
        })
        .collect();

    // Enforce deterministic response max-chars by truncating from the end (stable ordering).
    let mut truncated = false;
    while estimate_search_response_chars(&results) > RESPONSE_MAX_CHARS && !results.is_empty() {
        results.pop();
        truncated = true;
    }

    if truncated {
        Ok(AtlasEnvelope::ok_with_meta(
            AtlasSearchResponse { results },
            AtlasMeta {
                truncated: Some(true),
            },
        ))
    } else {
        Ok(AtlasEnvelope::ok(AtlasSearchResponse { results }))
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasGetSessionRequest {
    pub repo_id: i64,
    pub session_id: String,
    pub max_chunks: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSessionMeta {
    pub id: String,
    pub tool: String,
    pub model: Option<String>,
    pub imported_at: Option<String>,
    pub duration_min: Option<i64>,
    pub message_count: Option<i64>,
    pub purged_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasSessionChunk {
    pub chunk_uid: String,
    pub chunk_index: i64,
    pub role_mask: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasGetSessionResponse {
    pub session: AtlasSessionMeta,
    pub chunks: Vec<AtlasSessionChunk>,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn atlas_get_session(
    db: State<'_, DbState>,
    request: AtlasGetSessionRequest,
) -> Result<AtlasEnvelope<AtlasGetSessionResponse>, String> {
    let pool = &*db.0;

    if !repo_exists(pool, request.repo_id).await {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::RepoNotFound,
            "Unknown repoId",
        ));
    }

    if request.session_id.chars().count() > SESSION_ID_MAX_CHARS {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::BudgetSessionIdTooLong,
            format!("sessionId too long (max {SESSION_ID_MAX_CHARS} chars)"),
        ));
    }

    let max_chunks = match request.max_chunks {
        None => 10,
        Some(v) if v <= 0 => 10,
        Some(v) if v > GET_SESSION_MAX_CHUNKS => {
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::BudgetMaxChunksTooHigh,
                format!("maxChunks too high (max {GET_SESSION_MAX_CHUNKS})"),
            ));
        }
        Some(v) => v,
    };

    let row = sqlx::query(
        r#"
        SELECT id, tool, model, imported_at, duration_min, message_count, purged_at
        FROM sessions
        WHERE repo_id = ? AND id = ?
        LIMIT 1
        "#,
    )
    .bind(request.repo_id)
    .bind(&request.session_id)
    .fetch_optional(pool)
    .await;

    let row = match row {
        Ok(v) => v,
        Err(err) => {
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::Internal,
                format!("Session lookup failed: {err}"),
            ));
        }
    };

    let Some(row) = row else {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::SessionNotFound,
            "Session not found",
        ));
    };

    let session = AtlasSessionMeta {
        id: row.get("id"),
        tool: row.get("tool"),
        model: row.get("model"),
        imported_at: row.get("imported_at"),
        duration_min: row.get("duration_min"),
        message_count: row.try_get("message_count").ok(),
        purged_at: row.try_get("purged_at").ok(),
    };

    let chunk_rows = sqlx::query(
        r#"
        SELECT chunk_uid, chunk_index, role_mask, text
        FROM atlas_chunks
        WHERE repo_id = ? AND session_id = ?
        ORDER BY chunk_index ASC, chunk_uid ASC
        LIMIT ?
        "#,
    )
    .bind(request.repo_id)
    .bind(&request.session_id)
    .bind(max_chunks)
    .fetch_all(pool)
    .await;

    let chunk_rows = match chunk_rows {
        Ok(v) => v,
        Err(err) => {
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::Internal,
                format!("Chunk query failed: {err}"),
            ));
        }
    };

    let mut chunks: Vec<AtlasSessionChunk> = chunk_rows
        .into_iter()
        .map(|r| AtlasSessionChunk {
            chunk_uid: r.get("chunk_uid"),
            chunk_index: r.get("chunk_index"),
            role_mask: r.get("role_mask"),
            text: truncate_chars(&r.get::<String, _>("text"), SNIPPET_MAX_CHARS.max(800)),
        })
        .collect();

    let mut truncated = false;
    while estimate_get_session_response_chars(&session, &chunks) > RESPONSE_MAX_CHARS
        && !chunks.is_empty()
    {
        chunks.pop();
        truncated = true;
    }

    if truncated {
        Ok(AtlasEnvelope::ok_with_meta(
            AtlasGetSessionResponse { session, chunks },
            AtlasMeta {
                truncated: Some(true),
            },
        ))
    } else {
        Ok(AtlasEnvelope::ok(AtlasGetSessionResponse {
            session,
            chunks,
        }))
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasDoctorReport {
    pub repo_id: i64,
    pub derived_version: String,
    pub fts_table_ready: bool,
    pub indexable_sessions: i64,
    pub sessions_with_chunks: i64,
    pub chunks_indexed: i64,
    pub missing_sessions: i64,
    pub last_rebuild_at: Option<String>,
    pub last_updated_at: Option<String>,
    pub last_error: Option<String>,
    pub status: String,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn atlas_doctor_report(
    db: State<'_, DbState>,
    repo_id: i64,
) -> Result<AtlasEnvelope<AtlasDoctorReport>, String> {
    let pool = &*db.0;

    if !repo_exists(pool, repo_id).await {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::RepoNotFound,
            "Unknown repoId",
        ));
    }

    let fts_table_ready = detect_fts_table(pool).await;

    let indexable_sessions: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM sessions
        WHERE repo_id = ?
          AND purged_at IS NULL
          AND raw_json != '{"messages":[]}'
        "#,
    )
    .bind(repo_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let sessions_with_chunks: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT session_id)
        FROM atlas_chunks
        WHERE repo_id = ?
        "#,
    )
    .bind(repo_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let chunks_indexed: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM atlas_chunks
        WHERE repo_id = ?
        "#,
    )
    .bind(repo_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);

    let missing_sessions = (indexable_sessions - sessions_with_chunks).max(0);
    let state = fetch_index_state(pool, repo_id).await;

    let (last_rebuild_at, last_updated_at, last_error) = match &state {
        Some(s) => (
            s.last_rebuild_at.clone(),
            s.last_updated_at.clone(),
            s.last_error.clone(),
        ),
        None => (None, None, None),
    };

    let status = if !fts_table_ready {
        "missing_fts".to_string()
    } else if missing_sessions > 0 {
        "stale".to_string()
    } else {
        "ok".to_string()
    };

    Ok(AtlasEnvelope::ok(AtlasDoctorReport {
        repo_id,
        derived_version: ATLAS_DERIVED_VERSION.to_string(),
        fts_table_ready,
        indexable_sessions,
        sessions_with_chunks,
        chunks_indexed,
        missing_sessions,
        last_rebuild_at,
        last_updated_at,
        last_error,
        status,
    }))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasDoctorRebuildRequest {
    pub repo_id: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasDoctorRebuildSummary {
    pub repo_id: i64,
    pub sessions_processed: i64,
    pub chunks_written: i64,
    pub truncated_sessions: i64,
    pub deleted_chunks: u64,
    pub fts_rebuilt: bool,
}

#[tauri::command(rename_all = "camelCase")]
pub async fn atlas_doctor_rebuild_derived(
    db: State<'_, DbState>,
    request: AtlasDoctorRebuildRequest,
) -> Result<AtlasEnvelope<AtlasDoctorRebuildSummary>, String> {
    let pool = &*db.0;

    if !repo_exists(pool, request.repo_id).await {
        return Ok(AtlasEnvelope::err(
            AtlasErrorCode::RepoNotFound,
            "Unknown repoId",
        ));
    }

    let deleted_chunks = match projection::delete_chunks_for_repo(pool, request.repo_id).await {
        Ok(v) => v,
        Err(err) => {
            projection::mark_index_error(pool, request.repo_id, &err).await;
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::Internal,
                format!("Failed to clear derived chunks: {err}"),
            ));
        }
    };

    let sessions = sqlx::query(
        r#"
        SELECT id, raw_json
        FROM sessions
        WHERE repo_id = ?
          AND purged_at IS NULL
          AND raw_json != '{"messages":[]}'
        ORDER BY imported_at ASC, id ASC
        "#,
    )
    .bind(request.repo_id)
    .fetch_all(pool)
    .await;

    let sessions = match sessions {
        Ok(v) => v,
        Err(err) => {
            projection::mark_index_error(pool, request.repo_id, &err.to_string()).await;
            return Ok(AtlasEnvelope::err(
                AtlasErrorCode::Internal,
                format!("Failed to enumerate sessions: {err}"),
            ));
        }
    };

    let mut sessions_processed = 0i64;
    let mut chunks_written = 0i64;
    let mut truncated_sessions = 0i64;

    for row in sessions {
        let session_id: String = row.get("id");
        let raw_json: String = row.get("raw_json");
        sessions_processed += 1;

        match projection::upsert_chunks_for_session(pool, request.repo_id, &session_id, &raw_json)
            .await
        {
            Ok(sum) => {
                chunks_written += sum.chunks_written;
                if sum.truncated {
                    truncated_sessions += 1;
                }
            }
            Err(err) => {
                // Best-effort: keep going, but record the latest failure.
                projection::mark_index_error(pool, request.repo_id, &err).await;
            }
        }
    }

    // Best-effort: ask FTS to rebuild from content table (deterministic).
    let mut fts_rebuilt = false;
    if detect_fts_table(pool).await {
        let rebuilt = sqlx::query(
            r#"
            INSERT INTO atlas_chunks_fts(atlas_chunks_fts) VALUES('rebuild')
            "#,
        )
        .execute(pool)
        .await;
        fts_rebuilt = rebuilt.is_ok();
    }

    let _ = projection::refresh_index_state_counts(pool, request.repo_id, Some("rebuild")).await;

    Ok(AtlasEnvelope::ok(AtlasDoctorRebuildSummary {
        repo_id: request.repo_id,
        sessions_processed,
        chunks_written,
        truncated_sessions,
        deleted_chunks,
        fts_rebuilt,
    }))
}

// ------------------------- helpers -------------------------

async fn repo_exists(db: &SqlitePool, repo_id: i64) -> bool {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM repos
        WHERE id = ?
        LIMIT 1
        "#,
    )
    .bind(repo_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten();
    exists.is_some()
}

async fn detect_fts5(db: &SqlitePool) -> bool {
    let used: Option<i64> = sqlx::query_scalar("SELECT sqlite_compileoption_used('ENABLE_FTS5')")
        .fetch_optional(db)
        .await
        .ok()
        .flatten();

    // Some builds may not expose sqlite_compileoption_used; treat errors as unknown.
    used.unwrap_or(0) != 0
}

async fn detect_fts_table(db: &SqlitePool) -> bool {
    // 1) Presence in sqlite_master
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'atlas_chunks_fts'
        LIMIT 1
        "#,
    )
    .fetch_optional(db)
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return false;
    }

    // 2) Simple query succeeds
    sqlx::query("SELECT 1 FROM atlas_chunks_fts LIMIT 1")
        .fetch_optional(db)
        .await
        .is_ok()
}

fn build_match_query(raw: &str) -> Result<String, AtlasErrorCode> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(AtlasErrorCode::InvalidQuery);
    }

    let mut terms: Vec<String> = Vec::new();
    for part in trimmed.split_whitespace() {
        let normalized = normalize_term(part);
        if normalized.is_empty() {
            continue;
        }
        terms.push(normalized);
        if terms.len() > QUERY_MAX_TERMS {
            return Err(AtlasErrorCode::BudgetTooManyTerms);
        }
    }

    if terms.is_empty() {
        return Err(AtlasErrorCode::InvalidQuery);
    }

    // Use prefix queries for search-as-you-type.
    let mut out = String::new();
    for (i, term) in terms.iter().enumerate() {
        if i > 0 {
            out.push_str(" AND ");
        }
        out.push_str(term);
        out.push('*');
    }

    Ok(out)
}

fn normalize_term(input: &str) -> String {
    // Guard against FTS query injection: allow a small safe subset.
    // Note: unicode61 tokenizer will still segment; this is just query syntax hygiene.
    let mut out = String::new();
    for c in input.chars() {
        if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
            out.push(c.to_ascii_lowercase());
        }
    }
    out
}

fn truncate_chars(input: &str, max_chars: usize) -> String {
    if input.chars().count() <= max_chars {
        return input.to_string();
    }
    input.chars().take(max_chars).collect()
}

fn estimate_search_response_chars(results: &[AtlasSearchResult]) -> usize {
    let mut total = 0usize;
    for r in results {
        total += r.chunk_uid.len();
        total += r.session_id.len();
        total += r.snippet.len();
        total += r.session_imported_at.as_ref().map(|s| s.len()).unwrap_or(0);
        total += r.session_tool.as_ref().map(|s| s.len()).unwrap_or(0);
        total += r.session_model.as_ref().map(|s| s.len()).unwrap_or(0);
        total += 64; // overhead
    }
    total
}

fn estimate_get_session_response_chars(
    session: &AtlasSessionMeta,
    chunks: &[AtlasSessionChunk],
) -> usize {
    let mut total = 0usize;
    total += session.id.len();
    total += session.tool.len();
    total += session.model.as_ref().map(|s| s.len()).unwrap_or(0);
    total += session.imported_at.as_ref().map(|s| s.len()).unwrap_or(0);
    total += session.purged_at.as_ref().map(|s| s.len()).unwrap_or(0);

    for c in chunks {
        total += c.chunk_uid.len();
        total += c.role_mask.len();
        total += c.text.len();
        total += 64;
    }

    total
}

async fn fetch_index_state(db: &SqlitePool, repo_id: i64) -> Option<AtlasIndexState> {
    let row = sqlx::query(
        r#"
        SELECT repo_id, derived_version, last_rebuild_at, last_updated_at, last_error,
               sessions_indexed, chunks_indexed
        FROM atlas_index_state
        WHERE repo_id = ?
        LIMIT 1
        "#,
    )
    .bind(repo_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten()?;

    Some(AtlasIndexState {
        repo_id: row.get("repo_id"),
        derived_version: row.get("derived_version"),
        last_rebuild_at: row.get("last_rebuild_at"),
        last_updated_at: row.get("last_updated_at"),
        last_error: row.get("last_error"),
        sessions_indexed: row.get("sessions_indexed"),
        chunks_indexed: row.get("chunks_indexed"),
    })
}
