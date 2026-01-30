//! Tauri commands for attribution operations

use super::{
    models::{
        AttributionError, ContributionStats, SourceLensPage, SourceLensRequest, SourceLine,
        ToolStats,
    },
    notes::{
        build_attribution_note, parse_attribution_note, NoteFile, NoteRange, NoteSourceMeta,
        ParsedAttributionNote, ATTRIBUTION_NOTES_REF, LEGACY_ATTRIBUTION_NOTES_REF,
    },
    session_stats::{
        compute_human_contribution, compute_session_contribution, store_contribution_stats,
    },
};
use crate::DbState;
use git2::{DiffFormat, DiffOptions, Oid, Repository, Signature};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use tauri::State;

/// Get contribution stats for a commit
///
/// Returns cached stats if available, otherwise computes from linked session.
#[tauri::command(rename_all = "camelCase")]
pub async fn get_commit_contribution_stats(
    db: State<'_, DbState>,
    repo_id: i64,
    commit_sha: String,
) -> Result<ContributionStats, String> {
    let _ = ensure_line_attributions_for_commit(&db.0, repo_id, &commit_sha).await;

    // Try to get cached stats first
    if let Some(stats) = fetch_cached_stats(&db.0, repo_id, &commit_sha).await {
        return Ok(stats);
    }

    // Prefer line-level attribution if available
    if let Ok(Some(stats)) =
        compute_contribution_from_attributions(&db.0, repo_id, &commit_sha).await
    {
        if let Err(e) = store_contribution_stats(&db.0, repo_id, &commit_sha, None, &stats).await {
            eprintln!("Failed to cache stats: {}", e);
        }
        return Ok(stats);
    }

    // Get linked session for this commit
    let session = match fetch_linked_session(&db.0, repo_id, &commit_sha).await {
        Ok(s) => s,
        Err(_) => {
            // No linked session - return human-only stats
            return Ok(compute_human_contribution(0));
        }
    };

    // Get commit files for overlap calculation
    let commit_files = fetch_commit_files(&db.0, repo_id, &commit_sha)
        .await
        .unwrap_or_default();

    // Compute stats
    let stats = compute_session_contribution(&session, &commit_files);

    // Cache for next time
    let session_id = session.id.clone();
    if let Err(e) =
        store_contribution_stats(&db.0, repo_id, &commit_sha, Some(&session_id), &stats).await
    {
        eprintln!("Failed to cache stats: {}", e);
    }

    Ok(stats)
}

/// Get source lens for a file (Source Lens)
///
/// Returns paginated source attribution for a file at a specific commit.
/// Shows which lines were authored by agents vs humans.
#[tauri::command(rename_all = "camelCase")]
pub async fn get_file_source_lens(
    db: State<'_, DbState>,
    request: SourceLensRequest,
) -> Result<SourceLensPage, String> {
    let SourceLensRequest {
        repo_id,
        commit_sha,
        file_path,
        offset,
        limit,
    } = request;

    let _ = ensure_line_attributions_for_commit(&db.0, repo_id, &commit_sha).await;

    let repo_root = fetch_repo_root(&db.0, repo_id).await?;
    let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
    let file_lines = load_file_lines(&repo, &commit_sha, &file_path)?;

    if file_lines.is_empty() {
        return Ok(SourceLensPage {
            lines: Vec::new(),
            total_lines: 0,
            has_more: false,
        });
    }

    let attributions = fetch_line_attributions(&db.0, repo_id, &commit_sha, &file_path).await?;
    let line_meta = build_line_meta(file_lines.len(), &attributions);

    let total_lines = file_lines.len() as u32;
    let start = offset as usize;
    if start >= file_lines.len() {
        return Ok(SourceLensPage {
            lines: Vec::new(),
            total_lines,
            has_more: false,
        });
    }

    let end = (offset + limit) as usize;
    let slice = &file_lines[start..end.min(file_lines.len())];
    let lines: Vec<SourceLine> = slice
        .iter()
        .enumerate()
        .map(|(idx, content)| {
            let line_index = start + idx;
            let meta = line_meta.get(line_index).cloned().unwrap_or_default();
            SourceLine {
                line_number: (line_index + 1) as u32,
                content: content.clone(),
                author_type: meta.author_type,
                session_id: meta.session_id,
                ai_percentage: meta.ai_percentage,
                tool: meta.tool,
                model: meta.model,
                trace_available: meta.trace_available,
            }
        })
        .collect();

    let has_more = end < file_lines.len();

    Ok(SourceLensPage {
        lines,
        total_lines,
        has_more,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributionNoteImportSummary {
    pub commit_sha: String,
    pub status: String,
    pub imported_ranges: u32,
    pub imported_sessions: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributionNoteBatchSummary {
    pub total: u32,
    pub imported: u32,
    pub missing: u32,
    pub failed: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributionNoteExportSummary {
    pub commit_sha: String,
    pub status: String,
}

/// Import a single attribution note from git notes into local storage.
#[tauri::command(rename_all = "camelCase")]
pub async fn import_attribution_note(
    db: State<'_, DbState>,
    repo_id: i64,
    commit_sha: String,
) -> Result<AttributionNoteImportSummary, String> {
    import_attribution_note_internal(&db.0, repo_id, &commit_sha).await
}

/// Import multiple attribution notes from git notes into local storage.
#[tauri::command(rename_all = "camelCase")]
pub async fn import_attribution_notes_batch(
    db: State<'_, DbState>,
    repo_id: i64,
    commit_shas: Vec<String>,
) -> Result<AttributionNoteBatchSummary, String> {
    let mut imported = 0;
    let mut missing = 0;
    let mut failed = 0;

    for commit_sha in commit_shas {
        match import_attribution_note_internal(&db.0, repo_id, &commit_sha).await {
            Ok(summary) => {
                if summary.status == "imported" {
                    imported += 1;
                } else {
                    missing += 1;
                }
            }
            Err(_) => {
                failed += 1;
            }
        }
    }

    Ok(AttributionNoteBatchSummary {
        total: (imported + missing + failed) as u32,
        imported: imported as u32,
        missing: missing as u32,
        failed: failed as u32,
    })
}

/// Export local attribution data into git notes.
#[tauri::command(rename_all = "camelCase")]
pub async fn export_attribution_note(
    db: State<'_, DbState>,
    repo_id: i64,
    commit_sha: String,
) -> Result<AttributionNoteExportSummary, String> {
    let summary = export_attribution_note_internal(&db.0, repo_id, &commit_sha).await?;
    Ok(summary)
}

/// Database row for line attribution
#[derive(sqlx::FromRow)]
struct LineAttributionRow {
    start_line: i32,
    end_line: i32,
    session_id: Option<String>,
    author_type: String,
    ai_percentage: Option<i32>,
    tool: Option<String>,
    model: Option<String>,
    trace_available: i32,
}

/// Compute and cache stats for a batch of commits
///
/// Useful for pre-computing stats after importing many sessions.
#[tauri::command(rename_all = "camelCase")]
pub async fn compute_stats_batch(
    db: State<'_, DbState>,
    repo_id: i64,
    commit_shas: Vec<String>,
) -> Result<usize, String> {
    let mut computed = 0;

    for commit_sha in commit_shas {
        let _ = ensure_line_attributions_for_commit(&db.0, repo_id, &commit_sha).await;

        // Check if already cached
        if fetch_cached_stats(&db.0, repo_id, &commit_sha)
            .await
            .is_some()
        {
            continue;
        }

        if let Ok(Some(stats)) =
            compute_contribution_from_attributions(&db.0, repo_id, &commit_sha).await
        {
            if store_contribution_stats(&db.0, repo_id, &commit_sha, None, &stats)
                .await
                .is_ok()
            {
                computed += 1;
            }
            continue;
        }

        // Try to get linked session
        let session = match fetch_linked_session(&db.0, repo_id, &commit_sha).await {
            Ok(s) => s,
            Err(_) => continue,
        };

        // Get commit files
        let commit_files = fetch_commit_files(&db.0, repo_id, &commit_sha)
            .await
            .unwrap_or_default();

        // Compute and store
        let stats = compute_session_contribution(&session, &commit_files);
        let session_id = session.id.clone();

        if store_contribution_stats(&db.0, repo_id, &commit_sha, Some(&session_id), &stats)
            .await
            .is_ok()
        {
            computed += 1;
        }
    }

    Ok(computed)
}

/// Fetch cached stats from database
async fn fetch_cached_stats(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Option<ContributionStats> {
    let row = sqlx::query_as::<_, ContributionStatsRow>(
        r#"
        SELECT human_lines, ai_agent_lines, ai_assist_lines, collaborative_lines,
               total_lines, ai_percentage, tool, model
        FROM commit_contribution_stats
        WHERE repo_id = ? AND commit_sha = ?
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_optional(db)
    .await
    .ok()?;

    let breakdown = fetch_tool_breakdown(db, repo_id, commit_sha)
        .await
        .ok()
        .flatten();
    row.map(|r| r.into_stats(breakdown))
}

#[derive(sqlx::FromRow)]
struct LinkedSessionRow {
    session_id: String,
    tool: String,
    model: Option<String>,
    files: Option<String>,
}

async fn ensure_line_attributions_for_commit(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<(), String> {
    if line_attributions_exist(db, repo_id, commit_sha).await? {
        return Ok(());
    }

    let session = fetch_primary_session_for_commit(db, repo_id, commit_sha).await?;
    let Some(session) = session else {
        return Ok(());
    };

    let repo_root = fetch_repo_root(db, repo_id).await?;
    let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
    let commit_files = list_commit_files(&repo, commit_sha)?;
    let session_files = parse_session_files(&session.files);

    let candidate_files: Vec<String> = if session_files.is_empty() {
        commit_files
    } else {
        commit_files
            .into_iter()
            .filter(|path| session_files.contains(path))
            .collect()
    };

    if candidate_files.is_empty() {
        return Ok(());
    }

    for file_path in candidate_files {
        let ranges = collect_changed_ranges(&repo, commit_sha, &file_path)?;
        for range in ranges {
            let (author_type, ai_percentage) = match range.kind {
                ChangeKind::Added => ("ai_agent", None),
                ChangeKind::Modified => ("mixed", Some(50.0)),
            };
            sqlx::query(
                r#"
                INSERT INTO line_attributions (
                    repo_id,
                    commit_sha,
                    file_path,
                    start_line,
                    end_line,
                    session_id,
                    author_type,
                    ai_percentage,
                    tool,
                    model
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(repo_id)
            .bind(commit_sha)
            .bind(&file_path)
            .bind(range.start_line)
            .bind(range.end_line)
            .bind(&session.session_id)
            .bind(author_type)
            .bind(ai_percentage)
            .bind(&session.tool)
            .bind(&session.model)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

async fn line_attributions_exist(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<bool, String> {
    let exists: Option<i64> = sqlx::query_scalar(
        r#"
        SELECT 1
        FROM line_attributions
        WHERE repo_id = ? AND commit_sha = ?
        LIMIT 1
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(exists.is_some())
}

async fn fetch_primary_session_for_commit(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<Option<LinkedSessionRow>, String> {
    sqlx::query_as::<_, LinkedSessionRow>(
        r#"
        SELECT s.id as session_id, s.tool, s.model, s.files
        FROM session_links l
        JOIN sessions s ON s.id = l.session_id
        WHERE l.repo_id = ? AND l.commit_sha = ?
        ORDER BY l.confidence DESC, l.created_at DESC
        LIMIT 1
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())
}

fn parse_session_files(raw: &Option<String>) -> std::collections::HashSet<String> {
    raw.as_ref()
        .and_then(|value| serde_json::from_str::<Vec<String>>(value).ok())
        .unwrap_or_default()
        .into_iter()
        .collect()
}

fn list_commit_files(repo: &Repository, commit_sha: &str) -> Result<Vec<String>, String> {
    let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| e.to_string())?
                .tree()
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };

    let mut options = DiffOptions::new();
    options.context_lines(0);

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut options))
        .map_err(|e| e.to_string())?;

    let mut paths = std::collections::HashSet::new();
    for delta in diff.deltas() {
        if let Some(path) = delta.new_file().path() {
            paths.insert(path.to_string_lossy().to_string());
        }
    }

    Ok(paths.into_iter().collect())
}

fn collect_changed_ranges(
    repo: &Repository,
    commit_sha: &str,
    file_path: &str,
) -> Result<Vec<ChangedRange>, String> {
    let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(
            commit
                .parent(0)
                .map_err(|e| e.to_string())?
                .tree()
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };

    let mut opts = DiffOptions::new();
    opts.pathspec(file_path);
    opts.context_lines(0);

    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let mut ranges: Vec<ChangedRange> = Vec::new();
    let mut current_start: Option<i32> = None;
    let mut previous_line: Option<i32> = None;
    let mut current_kind: Option<ChangeKind> = None;
    let mut saw_deletion = false;

    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        if line.origin() == '-' {
            if let (Some(start), Some(prev), Some(kind)) =
                (current_start, previous_line, current_kind)
            {
                ranges.push(ChangedRange {
                    start_line: start,
                    end_line: prev,
                    kind,
                });
                current_start = None;
                previous_line = None;
                current_kind = None;
            }
            saw_deletion = true;
        } else if line.origin() == '+' {
            if let Some(new_lineno) = line.new_lineno() {
                let new_line = new_lineno as i32;
                match (current_start, previous_line) {
                    (Some(start), Some(prev)) if new_line == prev + 1 => {
                        previous_line = Some(new_line);
                        current_start = Some(start);
                    }
                    _ => {
                        if let (Some(start), Some(prev), Some(kind)) =
                            (current_start, previous_line, current_kind)
                        {
                            ranges.push(ChangedRange {
                                start_line: start,
                                end_line: prev,
                                kind,
                            });
                        }
                        current_start = Some(new_line);
                        previous_line = Some(new_line);
                        current_kind = Some(if saw_deletion {
                            ChangeKind::Modified
                        } else {
                            ChangeKind::Added
                        });
                    }
                }
            }
        } else if current_start.is_some() {
            if let (Some(start), Some(prev), Some(kind)) =
                (current_start, previous_line, current_kind)
            {
                ranges.push(ChangedRange {
                    start_line: start,
                    end_line: prev,
                    kind,
                });
            }
            current_start = None;
            previous_line = None;
            current_kind = None;
            saw_deletion = false;
        }
        true
    })
    .map_err(|e| e.to_string())?;

    if let (Some(start), Some(prev), Some(kind)) = (current_start, previous_line, current_kind) {
        ranges.push(ChangedRange {
            start_line: start,
            end_line: prev,
            kind,
        });
    }

    Ok(ranges)
}
/// Fetch linked session for a commit
async fn fetch_linked_session(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<crate::linking::SessionExcerpt, AttributionError> {
    use crate::models::SessionLink;

    // Get session link
    let link: SessionLink = sqlx::query_as(
        r#"
        SELECT * FROM session_links 
        WHERE repo_id = ? AND commit_sha = ?
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_one(db)
    .await
    .map_err(|_| AttributionError::SessionNotFound)?;

    // Get session data
    let session_json: String = sqlx::query_scalar(
        r#"
        SELECT raw_json FROM sessions WHERE id = ?
        "#,
    )
    .bind(&link.session_id)
    .fetch_one(db)
    .await
    .map_err(|e| AttributionError::DatabaseError(e.to_string()))?;

    // Parse session
    let session: crate::linking::SessionExcerpt = serde_json::from_str(&session_json)
        .map_err(|e| AttributionError::DatabaseError(format!("Failed to parse session: {}", e)))?;

    Ok(session)
}

/// Fetch files changed in a commit
async fn fetch_commit_files(
    _db: &sqlx::SqlitePool,
    _repo_id: i64,
    _commit_sha: &str,
) -> Result<Vec<String>, AttributionError> {
    // TODO: Get files from git or from stored commit data
    // For now, return empty (stats computation will use session files only)
    Ok(vec![])
}

/// Database row for contribution stats
#[derive(sqlx::FromRow)]
struct ContributionStatsRow {
    human_lines: i32,
    ai_agent_lines: i32,
    ai_assist_lines: i32,
    collaborative_lines: i32,
    total_lines: i32,
    ai_percentage: i32,
    tool: Option<String>,
    model: Option<String>,
}

impl ContributionStatsRow {
    fn into_stats(self, tool_breakdown: Option<Vec<ToolStats>>) -> ContributionStats {
        ContributionStats {
            human_lines: self.human_lines as u32,
            ai_agent_lines: self.ai_agent_lines as u32,
            ai_assist_lines: self.ai_assist_lines as u32,
            collaborative_lines: self.collaborative_lines as u32,
            total_lines: self.total_lines as u32,
            ai_percentage: self.ai_percentage as f32,
            tool_breakdown,
            primary_tool: self.tool,
            model: self.model,
        }
    }
}

#[derive(Clone)]
struct LineMeta {
    author_type: String,
    session_id: Option<String>,
    ai_percentage: Option<u8>,
    tool: Option<String>,
    model: Option<String>,
    trace_available: bool,
}

impl Default for LineMeta {
    fn default() -> Self {
        Self {
            author_type: "human".to_string(),
            session_id: None,
            ai_percentage: None,
            tool: None,
            model: None,
            trace_available: false,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ToolStatsRow {
    tool: String,
    model: Option<String>,
    line_count: i32,
}

#[derive(sqlx::FromRow)]
struct LineAttributionCommitRow {
    file_path: String,
    start_line: i32,
    end_line: i32,
    session_id: Option<String>,
    author_type: String,
    ai_percentage: Option<i32>,
    tool: Option<String>,
    model: Option<String>,
}

#[derive(Clone, Copy)]
struct ChangedRange {
    start_line: i32,
    end_line: i32,
    kind: ChangeKind,
}

#[derive(Clone, Copy)]
enum ChangeKind {
    Added,
    Modified,
}

#[derive(sqlx::FromRow)]
struct SessionMetaRow {
    tool: Option<String>,
    model: Option<String>,
    conversation_id: Option<String>,
    #[allow(dead_code)]
    trace_available: Option<i32>,
}

async fn fetch_tool_breakdown(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<Option<Vec<ToolStats>>, String> {
    let rows = sqlx::query_as::<_, ToolStatsRow>(
        r#"
        SELECT tool, model, line_count
        FROM commit_tool_stats
        WHERE repo_id = ? AND commit_sha = ?
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(None);
    }

    let stats = rows
        .into_iter()
        .map(|row| ToolStats {
            tool: row.tool,
            model: row.model,
            line_count: row.line_count.max(0) as u32,
        })
        .collect::<Vec<_>>();

    Ok(Some(stats))
}

async fn fetch_repo_root(db: &sqlx::SqlitePool, repo_id: i64) -> Result<String, String> {
    let path: String = sqlx::query_scalar(
        r#"
        SELECT path FROM repos WHERE id = ?
        "#,
    )
    .bind(repo_id)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Failed to load repo path: {}", e))?;

    Ok(path)
}

fn load_file_lines(
    repo: &Repository,
    commit_sha: &str,
    file_path: &str,
) -> Result<Vec<String>, String> {
    let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
    let tree = commit.tree().map_err(|e| e.to_string())?;
    let entry = tree
        .get_path(Path::new(file_path))
        .map_err(|e| e.to_string())?;
    let object = entry.to_object(repo).map_err(|e| e.to_string())?;
    let blob = object
        .as_blob()
        .ok_or_else(|| "File is not a blob".to_string())?;
    let content = String::from_utf8_lossy(blob.content());
    Ok(content.lines().map(|line| line.to_string()).collect())
}

async fn fetch_line_attributions(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
    file_path: &str,
) -> Result<Vec<LineAttributionRow>, String> {
    sqlx::query_as::<_, LineAttributionRow>(
        r#"
        SELECT
            la.start_line,
            la.end_line,
            la.session_id,
            la.author_type,
            la.ai_percentage,
            la.tool,
            la.model,
            COALESCE(s.trace_available, 0) as trace_available
        FROM line_attributions la
        LEFT JOIN sessions s ON s.id = la.session_id
        WHERE la.repo_id = ? AND la.commit_sha = ? AND la.file_path = ?
        ORDER BY la.start_line
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .bind(file_path)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

async fn fetch_line_attributions_for_commit(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<Vec<LineAttributionCommitRow>, String> {
    sqlx::query_as::<_, LineAttributionCommitRow>(
        r#"
        SELECT
            file_path,
            start_line,
            end_line,
            session_id,
            author_type,
            ai_percentage,
            tool,
            model
        FROM line_attributions
        WHERE repo_id = ? AND commit_sha = ?
        ORDER BY file_path, start_line
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Database error: {}", e))
}

async fn fetch_session_meta(
    db: &sqlx::SqlitePool,
    session_id: &str,
) -> Result<Option<SessionMetaRow>, String> {
    sqlx::query_as::<_, SessionMetaRow>(
        r#"
        SELECT tool, model, conversation_id, trace_available
        FROM sessions
        WHERE id = ?
        "#,
    )
    .bind(session_id)
    .fetch_optional(db)
    .await
    .map_err(|e| e.to_string())
}

fn build_line_meta(total_lines: usize, attrs: &[LineAttributionRow]) -> Vec<LineMeta> {
    let mut lines = vec![LineMeta::default(); total_lines];

    for attr in attrs {
        let start = attr.start_line.max(1) as usize;
        let end = attr.end_line.max(start as i32) as usize;
        for line_num in start..=end {
            if line_num == 0 || line_num > total_lines {
                continue;
            }
            let idx = line_num - 1;
            let meta = &mut lines[idx];
            apply_line_attr(meta, attr);
        }
    }

    lines
}

fn apply_line_attr(meta: &mut LineMeta, attr: &LineAttributionRow) {
    let incoming = attr.author_type.as_str();
    let incoming_kind = if incoming.is_empty() {
        "human"
    } else {
        incoming
    };
    let incoming_trace = attr.trace_available > 0;

    if meta.author_type == "human" {
        meta.author_type = incoming_kind.to_string();
        meta.session_id = attr.session_id.clone();
        meta.ai_percentage = attr.ai_percentage.map(|v| v as u8);
        meta.tool = attr.tool.clone();
        meta.model = attr.model.clone();
        meta.trace_available = incoming_trace;
        return;
    }

    if meta.author_type != incoming_kind {
        meta.author_type = "mixed".to_string();
        meta.ai_percentage = Some(50);
    } else if incoming_kind == "mixed" {
        if let Some(value) = attr.ai_percentage {
            meta.ai_percentage = Some(value as u8);
        }
    }

    if meta.session_id.is_none() {
        meta.session_id = attr.session_id.clone();
    }
    if meta.tool.is_none() {
        meta.tool = attr.tool.clone();
    }
    if meta.model.is_none() {
        meta.model = attr.model.clone();
    }
    meta.trace_available = meta.trace_available || incoming_trace;
}

async fn compute_contribution_from_attributions(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<Option<ContributionStats>, String> {
    let rows = fetch_line_attributions_for_commit(db, repo_id, commit_sha).await?;
    if rows.is_empty() {
        return Ok(None);
    }

    let repo_root = fetch_repo_root(db, repo_id).await?;
    let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;

    let mut by_file: HashMap<String, Vec<LineAttributionCommitRow>> = HashMap::new();
    for row in rows {
        by_file.entry(row.file_path.clone()).or_default().push(row);
    }

    let mut stats = ContributionStats::default();
    let mut tool_counts: HashMap<(String, Option<String>), u32> = HashMap::new();

    for (file_path, attrs) in by_file {
        let file_lines = match load_file_lines(&repo, commit_sha, &file_path) {
            Ok(lines) => lines,
            Err(_) => continue,
        };
        if file_lines.is_empty() {
            continue;
        }

        let file_attrs = attrs
            .into_iter()
            .map(|row| LineAttributionRow {
                start_line: row.start_line,
                end_line: row.end_line,
                session_id: row.session_id,
                author_type: row.author_type,
                ai_percentage: row.ai_percentage,
                tool: row.tool,
                model: row.model,
                trace_available: 0,
            })
            .collect::<Vec<_>>();

        let line_meta = build_line_meta(file_lines.len(), &file_attrs);

        for meta in line_meta {
            match meta.author_type.as_str() {
                "ai_agent" => {
                    stats.ai_agent_lines += 1;
                    increment_tool_count(&mut tool_counts, &meta);
                }
                "ai_tab" => {
                    stats.ai_assist_lines += 1;
                    increment_tool_count(&mut tool_counts, &meta);
                }
                "mixed" => {
                    stats.collaborative_lines += 1;
                }
                _ => {
                    stats.human_lines += 1;
                }
            }
        }
    }

    stats.total_lines = stats.human_lines
        + stats.ai_agent_lines
        + stats.ai_assist_lines
        + stats.collaborative_lines;

    if stats.total_lines > 0 {
        let ai_total = stats.ai_agent_lines + stats.ai_assist_lines + stats.collaborative_lines;
        stats.ai_percentage = (ai_total as f32 / stats.total_lines as f32) * 100.0;
    }

    if !tool_counts.is_empty() {
        let mut breakdown = tool_counts
            .into_iter()
            .map(|((tool, model), count)| ToolStats {
                tool,
                model,
                line_count: count,
            })
            .collect::<Vec<_>>();
        breakdown.sort_by(|a, b| b.line_count.cmp(&a.line_count));
        stats.primary_tool = breakdown.first().map(|b| b.tool.clone());
        stats.model = breakdown.first().and_then(|b| b.model.clone());
        stats.tool_breakdown = Some(breakdown);
    }

    Ok(Some(stats))
}

fn increment_tool_count(counts: &mut HashMap<(String, Option<String>), u32>, meta: &LineMeta) {
    let tool = meta.tool.clone().unwrap_or_else(|| "unknown".to_string());
    let key = (tool, meta.model.clone());
    *counts.entry(key).or_insert(0) += 1;
}

async fn import_attribution_note_internal(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<AttributionNoteImportSummary, String> {
    let repo_root = fetch_repo_root(db, repo_id).await?;

    // Parse the note in a separate block to ensure repo/note are dropped before await
    let parsed = {
        let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
        let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;

        let note = match repo
            .find_note(Some(ATTRIBUTION_NOTES_REF), oid)
            .or_else(|_| repo.find_note(Some(LEGACY_ATTRIBUTION_NOTES_REF), oid))
        {
            Ok(note) => note,
            Err(_) => {
                return Ok(AttributionNoteImportSummary {
                    commit_sha: commit_sha.to_string(),
                    status: "missing".to_string(),
                    imported_ranges: 0,
                    imported_sessions: 0,
                });
            }
        };

        let message = note
            .message()
            .ok_or_else(|| "Attribution note is not valid UTF-8".to_string())?
            .to_string();

        // note and repo are dropped here, before the await below
        parse_attribution_note(&message)
    };

    if parsed.files.is_empty() {
        return Ok(AttributionNoteImportSummary {
            commit_sha: commit_sha.to_string(),
            status: "missing".to_string(),
            imported_ranges: 0,
            imported_sessions: 0,
        });
    }

    let (ranges, sessions) =
        store_line_attributions_from_note(db, repo_id, commit_sha, &parsed).await?;

    if let Ok(Some(stats)) = compute_contribution_from_attributions(db, repo_id, commit_sha).await {
        let _ = store_contribution_stats(db, repo_id, commit_sha, None, &stats).await;
    }

    Ok(AttributionNoteImportSummary {
        commit_sha: commit_sha.to_string(),
        status: "imported".to_string(),
        imported_ranges: ranges,
        imported_sessions: sessions,
    })
}

async fn store_line_attributions_from_note(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
    parsed: &ParsedAttributionNote,
) -> Result<(u32, u32), String> {
    sqlx::query(
        r#"
        DELETE FROM line_attributions
        WHERE repo_id = ? AND commit_sha = ?
        "#,
    )
    .bind(repo_id)
    .bind(commit_sha)
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    let mut range_count = 0;
    let mut session_ids: HashMap<String, ()> = HashMap::new();

    for file in &parsed.files {
        for range in &file.ranges {
            let mut meta = parsed
                .sources
                .get(&range.session_id)
                .cloned()
                .unwrap_or_default();

            if meta.tool.is_none() || meta.model.is_none() || meta.conversation_id.is_none() {
                if let Ok(Some(session)) = fetch_session_meta(db, &range.session_id).await {
                    if meta.tool.is_none() {
                        meta.tool = session.tool;
                    }
                    if meta.model.is_none() {
                        meta.model = session.model;
                    }
                    if meta.conversation_id.is_none() {
                        meta.conversation_id = session.conversation_id;
                    }
                }
            }

            let author_type = match meta.checkpoint_kind.as_deref() {
                Some("ai_tab") | Some("ai_assist") => "ai_tab",
                _ => "ai_agent",
            };

            sqlx::query(
                r#"
                INSERT INTO line_attributions (
                    repo_id,
                    commit_sha,
                    file_path,
                    start_line,
                    end_line,
                    session_id,
                    author_type,
                    ai_percentage,
                    tool,
                    model
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(repo_id)
            .bind(commit_sha)
            .bind(&file.path)
            .bind(range.start_line)
            .bind(range.end_line)
            .bind(&range.session_id)
            .bind(author_type)
            .bind(None::<f32>)
            .bind(&meta.tool)
            .bind(&meta.model)
            .execute(db)
            .await
            .map_err(|e| e.to_string())?;

            range_count += 1;
            session_ids.insert(range.session_id.clone(), ());
        }
    }

    Ok((range_count, session_ids.len() as u32))
}

async fn export_attribution_note_internal(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
) -> Result<AttributionNoteExportSummary, String> {
    let rows = fetch_line_attributions_for_commit(db, repo_id, commit_sha).await?;
    if rows.is_empty() {
        return Ok(AttributionNoteExportSummary {
            commit_sha: commit_sha.to_string(),
            status: "empty".to_string(),
        });
    }

    let mut files_map: HashMap<String, NoteFile> = HashMap::new();
    let mut sources: HashMap<String, NoteSourceMeta> = HashMap::new();

    for row in rows {
        let Some(session_id) = row.session_id.clone() else {
            continue;
        };

        let file_entry = files_map.entry(row.file_path.clone()).or_insert(NoteFile {
            path: row.file_path.clone(),
            ranges: Vec::new(),
        });

        file_entry.ranges.push(NoteRange {
            session_id: session_id.clone(),
            start_line: row.start_line,
            end_line: row.end_line,
        });

        let source = sources.entry(session_id.clone()).or_default();
        if source.tool.is_none() {
            source.tool = row.tool.clone();
        }
        if source.model.is_none() {
            source.model = row.model.clone();
        }
        if source.checkpoint_kind.is_none() {
            source.checkpoint_kind = Some(match row.author_type.as_str() {
                "ai_tab" => "ai_tab".to_string(),
                _ => "ai_agent".to_string(),
            });
        }
    }

    for (session_id, source) in sources.iter_mut() {
        if let Ok(Some(meta)) = fetch_session_meta(db, session_id).await {
            if source.tool.is_none() {
                source.tool = meta.tool;
            }
            if source.model.is_none() {
                source.model = meta.model;
            }
            if source.conversation_id.is_none() {
                source.conversation_id = meta.conversation_id;
            }
        }
    }

    let files = files_map.into_values().collect::<Vec<_>>();
    let note_text = build_attribution_note(commit_sha, &files, &sources);

    let repo_root = fetch_repo_root(db, repo_id).await?;
    let repo = Repository::open(&repo_root).map_err(|e| e.to_string())?;
    let oid = Oid::from_str(commit_sha).map_err(|e| e.to_string())?;

    let signature = repo
        .signature()
        .or_else(|_| Signature::now("Narrative", "narrative@local"))
        .map_err(|e| e.to_string())?;

    repo.note(
        &signature,
        &signature,
        Some(ATTRIBUTION_NOTES_REF),
        oid,
        &note_text,
        true,
    )
    .map_err(|e| e.to_string())?;

    Ok(AttributionNoteExportSummary {
        commit_sha: commit_sha.to_string(),
        status: "exported".to_string(),
    })
}
