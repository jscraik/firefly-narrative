//! Session-to-commit link management.
//!
//! This module provides CRUD operations for the `session_links` table,
//! which stores associations between AI sessions and git commits.
//!
//! # Core Operations
//!
//! - `create_or_update_session_link` - Create or update a session link (upsert)
//! - `get_session_links_for_repo` - Get all links for a repository
//! - `get_session_links_for_commit` - Get all sessions linked to a commit
//! - `delete_session_link` - Remove a session link
//!
//! # Concurrent Safety
//!
//! The `create_or_update_session_link` function uses SQLite's `ON CONFLICT`
//! clause to handle concurrent imports gracefully.
//!
//! # Evidence
//!
//! Build Plan Epic 2 Stories 2.2-2.3.
//! Resolution Summary Backend fix 2: "Wrap in transaction, UPDATE on SQLITE_CONSTRAINT."

use crate::models::SessionLink;
use sqlx::{Row, SqlitePool};

/// Create or update a session link (upsert).
///
/// This function implements the upsert pattern using SQLite's `ON CONFLICT`
/// clause. If a session link already exists for the given `(repo_id, session_id)`
/// pair, it updates the existing record instead of creating a duplicate.
///
/// # Arguments
///
/// * `pool` - SQLite database pool from tauri_plugin_sql
/// * `repo_id` - Repository ID
/// * `session_id` - Session identifier (matches SessionExcerpt.id)
/// * `commit_sha` - Git commit SHA to link to
/// * `confidence` - Algorithm confidence score (0.0 to 1.0)
/// * `auto_linked` - true if algorithm-suggested, false if manual
///
/// # Returns
///
/// * `Ok(id)` - The ID of the created or updated session link
/// * `Err(String)` - Database error message
///
/// # Evidence
///
/// Build Plan Epic 2 Story 2.2.
/// Build Plan "Concurrent Import Handling" section defines upsert pattern.
#[tauri::command(rename_all = "camelCase")]
pub async fn create_or_update_session_link(
    pool: tauri::State<'_, SqlitePool>,
    repo_id: i64,
    session_id: String,
    commit_sha: String,
    confidence: f64,
    auto_linked: bool,
) -> Result<i64, String> {
    // Validate confidence is in valid range
    if !(0.0..=1.0).contains(&confidence) {
        return Err(format!(
            "Invalid confidence: {confidence}. Must be between 0.0 and 1.0."
        ));
    }

    // Validate session_id is not empty
    if session_id.is_empty() {
        return Err("session_id cannot be empty".into());
    }

    // Validate commit_sha format (basic check for hex string)
    if commit_sha.is_empty() || commit_sha.len() < 4 {
        return Err("commit_sha must be at least 4 characters".into());
    }

    let db = pool.inner();

    // Perform upsert using ON CONFLICT with parameter binding
    let result = sqlx::query(
        r#"
        INSERT INTO session_links (repo_id, session_id, commit_sha, confidence, auto_linked)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(repo_id, session_id) DO UPDATE SET
            commit_sha = excluded.commit_sha,
            confidence = excluded.confidence,
            auto_linked = excluded.auto_linked
        RETURNING id
        "#,
    )
    .bind(repo_id)
    .bind(&session_id)
    .bind(&commit_sha)
    .bind(confidence)
    .bind(auto_linked)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    Ok(result.get("id"))
}

/// Get all session links for a repository.
///
/// # Arguments
///
/// * `pool` - SQLite database pool from tauri_plugin_sql
/// * `repo_id` - Repository ID
///
/// # Returns
///
/// * `Ok(Vec<SessionLink>)` - All session links for the repository
/// * `Err(String)` - Database error message
///
/// # Evidence
///
/// Build Plan Epic 2 Story 2.2.
#[tauri::command(rename_all = "camelCase")]
pub async fn get_session_links_for_repo(
    pool: tauri::State<'_, SqlitePool>,
    repo_id: i64,
) -> Result<Vec<SessionLink>, String> {
    let db = pool.inner();

    let rows = sqlx::query(
        r#"
        SELECT id, repo_id, session_id, commit_sha, confidence, auto_linked, created_at
        FROM session_links
        WHERE repo_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(repo_id)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    let links: Vec<SessionLink> = rows
        .iter()
        .map(|row| SessionLink {
            id: row.get("id"),
            repo_id: row.get("repo_id"),
            session_id: row.get("session_id"),
            commit_sha: row.get("commit_sha"),
            confidence: row.get("confidence"),
            auto_linked: row.get("auto_linked"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(links)
}

/// Get all sessions linked to a specific commit.
///
/// # Arguments
///
/// * `pool` - SQLite database pool from tauri_plugin_sql
/// * `repo_id` - Repository ID
/// * `commit_sha` - Git commit SHA
///
/// # Returns
///
/// * `Ok(Vec<SessionLink>)` - All session links for the commit
/// * Err(String) - Database error message
///
/// # Evidence
///
/// Build Plan Epic 2 Story 2.2.
#[tauri::command(rename_all = "camelCase")]
pub async fn get_session_links_for_commit(
    pool: tauri::State<'_, SqlitePool>,
    repo_id: i64,
    commit_sha: String,
) -> Result<Vec<SessionLink>, String> {
    let db = pool.inner();

    let rows = sqlx::query(
        r#"
        SELECT id, repo_id, session_id, commit_sha, confidence, auto_linked, created_at
        FROM session_links
        WHERE repo_id = $1 AND commit_sha = $2
        ORDER BY created_at DESC
        "#,
    )
    .bind(repo_id)
    .bind(&commit_sha)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {e}"))?;

    let links: Vec<SessionLink> = rows
        .iter()
        .map(|row| SessionLink {
            id: row.get("id"),
            repo_id: row.get("repo_id"),
            session_id: row.get("session_id"),
            commit_sha: row.get("commit_sha"),
            confidence: row.get("confidence"),
            auto_linked: row.get("auto_linked"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(links)
}

/// Delete a session link.
///
/// This removes the association between a session and a commit. The session
/// data itself is not deleted (it remains in the panel as "unlinked").
///
/// # Arguments
///
/// * `pool` - SQLite database pool from tauri_plugin_sql
/// * `repo_id` - Repository ID
/// * `session_id` - Session identifier to unlink
///
/// # Returns
///
/// * `Ok(())` - Link successfully deleted
/// *Err(String)` - Database error message
///
/// # Evidence
///
/// Build Plan Epic 2 Story 2.2.
#[tauri::command(rename_all = "camelCase")]
pub async fn delete_session_link(
    pool: tauri::State<'_, SqlitePool>,
    repo_id: i64,
    session_id: String,
) -> Result<(), String> {
    let db = pool.inner();

    sqlx::query("DELETE FROM session_links WHERE repo_id = $1 AND session_id = $2")
        .bind(repo_id)
        .bind(&session_id)
        .execute(db)
        .await
        .map_err(|e| format!("Database error: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    // Note: These tests require a test database setup.
    // In a real implementation, you would use sqlx::testing::TestHarness
    // or a fixture setup to create and tear down test databases.

    // TODO: Add unit tests for:
    // - create_or_update_session_link with valid data
    // - create_or_update_session_link with invalid confidence
    // - create_or_update_session_link with empty session_id
    // - get_session_links_for_repo with no links
    // - get_session_links_for_repo with multiple links
    // - get_session_links_for_commit with no links
    // - get_session_links_for_commit with multiple sessions (multi-session case)
    // - delete_session_link with non-existent link
    // - delete_session_link with valid link
    // - UNIQUE constraint: concurrent insert triggers UPDATE

    // See Build Plan Epic 2 Story 2.2 for validation requirements.
}
