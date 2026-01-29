//! Tauri commands for session-to-commit linking.
//!
//! This module exposes the linking algorithm to the frontend via Tauri's
//! IPC mechanism. It handles session import, database queries, and
//! result storage.
//!
//! # Commands
//!
//! - `link_session_to_commit` - Link a session to the best matching commit
//! - `import_session_file` - Import a session from a JSON file
//!
//! # Evidence
//!
//! Build Plan Epic 3 Story 3.4.
//! Build Plan Data + Contracts section defines API routes.

use crate::linking::{
    detect_secrets, link_session_to_commits, GitCommit, LinkResult,
    SessionExcerpt, SessionMessage, SessionMessageRole, SessionTool,
};
use sqlx::{Row, SqlitePool};
use std::collections::HashMap;

/// Convert frontend SessionTool to backend SessionTool
fn convert_session_tool(tool: &str) -> SessionTool {
    match tool {
        "claude-code" => SessionTool::ClaudeCode,
        "codex" => SessionTool::Codex,
        _ => SessionTool::Unknown,
    }
}

/// Convert frontend session to backend SessionExcerpt
fn convert_session_excerpt(session: FrontendSessionExcerpt) -> SessionExcerpt {
    SessionExcerpt {
        id: session.id,
        tool: convert_session_tool(&session.tool),
        duration_min: session.duration_min,
        imported_at_iso: session.imported_at_iso,
        messages: session
            .messages
            .into_iter()
            .map(|m| SessionMessage {
                id: m.id,
                role: match m.role.as_str() {
                    "user" => SessionMessageRole::User,
                    "assistant" => SessionMessageRole::Assistant,
                    _ => SessionMessageRole::User,
                },
                text: m.text,
                files: m.files,
            })
            .collect(),
    }
}

/// Frontend session format (matches TypeScript SessionExcerpt)
#[derive(serde::Deserialize, Clone)]
pub struct FrontendSessionExcerpt {
    id: String,
    tool: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration_min: Option<i64>,
    imported_at_iso: String,
    messages: Vec<FrontendSessionMessage>,
}

#[derive(serde::Deserialize, Clone)]
pub struct FrontendSessionMessage {
    id: String,
    role: String,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    files: Option<Vec<String>>,
}

/// Query commits for a repository within a time window.
///
/// # Arguments
///
/// * `pool` - SQLite database pool
/// * `repo_id` - Repository ID
/// * `window_start` - Start of time window (ISO string)
/// * `window_end` - End of time window (ISO string)
///
/// # Returns
///
/// * `Ok(Vec<GitCommit>)` - Commits with their changed files
/// * `Err(String)` - Database error
async fn query_commits_in_window(
    pool: &SqlitePool,
    repo_id: i64,
    window_start: &str,
    window_end: &str,
) -> Result<Vec<GitCommit>, String> {
    // Query commits in time window
    let commit_rows = sqlx::query(
        r#"
        SELECT sha, authored_at, subject
        FROM commits
        WHERE repo_id = $1 AND authored_at >= $2 AND authored_at <= $3
        ORDER BY authored_at ASC
        "#
    )
    .bind(repo_id)
    .bind(window_start)
    .bind(window_end)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Database error: {}", e))?;

    // Query file changes for each commit
    let mut commits_by_sha: HashMap<String, GitCommit> = HashMap::new();

    for row in commit_rows {
        let sha: String = row.get("sha");
        commits_by_sha.insert(
            sha.clone(),
            GitCommit {
                sha,
                authored_at: row.get("authored_at"),
                message: row.get("subject"),
                files: Vec::new(),
            },
        );
    }

    // If no commits found, return empty
    if commits_by_sha.is_empty() {
        return Ok(Vec::new());
    }

    // Query file changes for all commits
    let shas: Vec<&String> = commits_by_sha.keys().collect();

    // Build dynamic query for file changes
    if shas.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders = shas.iter()
        .enumerate()
        .map(|(i, _)| format!("${}", i + 4)) // Start at $4 because $1=$3 are used above
        .collect::<Vec<_>>()
        .join(", ");

    let file_query = format!(
        "SELECT commit_sha, path FROM file_changes WHERE repo_id = $1 AND commit_sha IN ({})",
        placeholders
    );

    let mut query = sqlx::query(&file_query).bind(repo_id);
    for sha in &shas {
        query = query.bind(sha);
    }

    let file_rows = query
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    // Map file changes to commits
    for row in file_rows {
        let commit_sha: String = row.get("commit_sha");
        let path: String = row.get("path");

        if let Some(commit) = commits_by_sha.get_mut(&commit_sha) {
            commit.files.push(path);
        }
    }

    Ok(commits_by_sha.into_values().collect())
}

/// Link a session to its best matching commit.
///
/// This command:
/// 1. Parses the session data
/// 2. Queries commits in the time window
/// 3. Runs the linking algorithm
/// 4. Stores the link if confidence >= 0.7
/// 5. Returns the link result
///
/// # Arguments
///
/// * `pool` - SQLite database pool
/// * `repo_id` - Repository ID
/// * `session_data` - Session excerpt JSON from frontend
///
/// # Returns
///
/// * `Ok(LinkResult)` - Session successfully linked
/// * `Err(String)` - Linking failed (includes reason)
///
/// # Evidence
///
/// Build Plan Epic 3 Story 3.4.
/// Build Plan Data + Contracts: `link_session_to_commit(repo_id, session_id, ...)`
#[tauri::command]
pub async fn link_session_to_commit(
    pool: tauri::State<'_, SqlitePool>,
    repo_id: i64,
    session_data: FrontendSessionExcerpt,
) -> Result<LinkResult, String> {
    let db = pool.inner();

    // Calculate time window for commit lookup (±4 hours from session)
    let session_end = chrono::DateTime::parse_from_rfc3339(&session_data.imported_at_iso)
        .map_err(|e| format!("Invalid session timestamp: {}", e))?
        .with_timezone(&chrono::Utc);
    let tolerance = chrono::Duration::minutes(240); // 4 hours
    let window_start = (session_end - tolerance).format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let window_end = (session_end + tolerance).format("%Y-%m-%dT%H:%M:%SZ").to_string();

    // Query commits in time window
    let commits = query_commits_in_window(db, repo_id, &window_start, &window_end).await?;

    // Convert to backend format
    let session = convert_session_excerpt(session_data);

    // Run linking algorithm
    let result = link_session_to_commits(&session, &commits)
        .map_err(|e| format!("{}", e))?;

    // Store the link in database
    sqlx::query(
        r#"
        INSERT INTO session_links (repo_id, session_id, commit_sha, confidence, auto_linked)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(repo_id, session_id) DO UPDATE SET
            commit_sha = excluded.commit_sha,
            confidence = excluded.confidence,
            auto_linked = excluded.auto_linked
        RETURNING id
        "#
    )
    .bind(repo_id)
    .bind(&session.id)
    .bind(&result.commit_sha)
    .bind(result.confidence)
    .bind(result.auto_linked)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Failed to store link: {}", e))?
    .get::<i64, _>("id");

    // Return result
    Ok(LinkResult {
        commit_sha: result.commit_sha,
        confidence: result.confidence,
        auto_linked: result.auto_linked,
        temporal_score: result.temporal_score,
        file_score: result.file_score,
    })
}

/// Import a session file from disk and link it to a commit.
///
/// This command:
/// 1. Reads the session file from disk
/// 2. Validates the format
/// 3. Scans for secrets (security check)
/// 4. Links to best matching commit
/// 5. Returns the result or detected secrets
///
/// # Arguments
///
/// * `pool` - SQLite database pool
/// * `repo_id` - Repository ID
/// * `file_path` - Path to session JSON file
///
/// # Returns
///
/// * `Ok(LinkResult)` - Session imported and linked
/// * `Err(String)` - Import failed (includes secrets detected)
///
/// # Evidence
///
/// Build Plan Epic 3 Story 3.4.
/// Build Plan Epic 7 Story 7.1: Security test for path traversal.
#[tauri::command]
pub async fn import_session_file(
    pool: tauri::State<'_, SqlitePool>,
    repo_id: i64,
    file_path: String,
) -> Result<LinkResult, String> {
    // Security: Validate path traversal (Build Plan Epic 7 Story 7.1)
    // Reject paths containing .. or absolute paths
    if file_path.contains("..") {
        return Err("Path traversal detected: .. not allowed in file paths".into());
    }
    if file_path.starts_with('/') || file_path.starts_with('\\') {
        return Err("Absolute paths not allowed in file paths".into());
    }

    // Read session file
    let session_content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| format!("Failed to read session file: {}", e))?;

    // Parse session JSON
    let session_data: FrontendSessionExcerpt = serde_json::from_str(&session_content)
        .map_err(|e| format!("Failed to parse session JSON: {}", e))?;

    // Convert to backend format for secret scanning
    let session = convert_session_excerpt(session_data.clone());

    // Security: Scan for secrets before processing
    let detected_secrets: Vec<String> = session
        .messages
        .iter()
        .flat_map(|msg| detect_secrets(&msg.text))
        .collect();

    if !detected_secrets.is_empty() {
        return Err(format!(
            "Secrets detected in session: {}. Please redact before importing.",
            detected_secrets.join(", ")
        ));
    }

    // Import using link_session_to_commit command
    link_session_to_commit(pool, repo_id, session_data).await
}
