//! narrative-cli
//!
//! Minimal CLI used by git hooks (hooks-first integration).
//! This binary is intentionally dependency-light (no clap).

use chrono::Utc;
use git2::Repository;
use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
use std::env;
use std::path::PathBuf;

fn usage() -> ! {
    eprintln!(
        "Usage:\n  narrative-cli hook post-commit --repo <path>\n  narrative-cli hook post-merge --repo <path>\n  narrative-cli hook post-rewrite --repo <path> --command <name> --rewritten <file>\n"
    );
    std::process::exit(2);
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

fn default_db_path() -> Option<PathBuf> {
    if let Ok(identifier) = env::var("NARRATIVE_APP_ID") {
        return dirs::data_dir().map(|base| base.join(identifier).join("narrative.db"));
    }

    dirs::data_dir().map(|base| {
        let primary = base
            .join("com.jamie.firefly-narrative")
            .join("narrative.db");
        if primary.exists() {
            return primary;
        }
        let legacy = base.join("com.jamie.narrative-mvp").join("narrative.db");
        if legacy.exists() {
            return legacy;
        }
        primary
    })
}

async fn connect_db() -> Result<SqlitePool, String> {
    let db_path = env::var("NARRATIVE_DB_PATH")
        .ok()
        .map(PathBuf::from)
        .or_else(default_db_path)
        .ok_or_else(|| "Could not resolve database path (set NARRATIVE_DB_PATH)".to_string())?;

    let options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true);

    SqlitePool::connect_with(options)
        .await
        .map_err(|e| format!("DB connect failed: {e}"))
}

async fn ensure_repo_id(db: &SqlitePool, repo_path: &str) -> Result<i64, String> {
    let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM repos WHERE path = ?")
        .bind(repo_path)
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(id) = existing {
        return Ok(id);
    }

    let inserted: i64 = sqlx::query_scalar(
        r#"
        INSERT INTO repos (path, last_opened_at)
        VALUES (?, CURRENT_TIMESTAMP)
        RETURNING id
        "#,
    )
    .bind(repo_path)
    .fetch_one(db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(inserted)
}

fn head_sha(repo_root: &str) -> Result<String, String> {
    let repo = Repository::open(repo_root).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let oid = head
        .target()
        .ok_or_else(|| "HEAD has no target".to_string())?;
    Ok(oid.to_string())
}

async fn export_head_notes(db: &SqlitePool, repo_id: i64, sha: &str) -> Result<(), String> {
    // Export attribution + sessions notes if there is data in cache.
    let _ = narrative_desktop_mvp::attribution::notes_io::export_attribution_note(
        db,
        repo_id,
        sha.to_string(),
    )
    .await;
    let _ = narrative_desktop_mvp::story_anchors::sessions_notes_io::export_sessions_note(
        db, repo_id, sha,
    )
    .await;
    Ok(())
}

async fn reconcile_commits(
    db: &SqlitePool,
    repo_id: i64,
    repo_root: &str,
    commit_shas: &[String],
    write_recovered_notes: bool,
) -> Result<(), String> {
    use narrative_desktop_mvp::attribution::git_utils::compute_rewrite_key;
    use narrative_desktop_mvp::attribution::line_attribution::{
        ensure_line_attributions_for_commit, store_rewrite_key,
    };

    let repo = Repository::open(repo_root).map_err(|e| e.to_string())?;

    for sha in commit_shas {
        let rewrite_key = compute_rewrite_key(&repo, sha).ok();
        let _ = store_rewrite_key(db, repo_id, sha, rewrite_key.as_deref(), Some("patch-id")).await;

        let _ = ensure_line_attributions_for_commit(db, repo_id, sha).await;

        if let Some(key) = rewrite_key.as_deref() {
            let source: Option<String> = sqlx::query_scalar(
                r#"
                SELECT commit_sha
                FROM commit_rewrite_keys
                WHERE repo_id = ? AND rewrite_key = ? AND commit_sha != ?
                ORDER BY updated_at DESC
                LIMIT 1
                "#,
            )
            .bind(repo_id)
            .bind(key)
            .bind(sha)
            .fetch_optional(db)
            .await
            .unwrap_or(None);

            if let Some(source_commit) = source {
                let session_ids: Vec<String> = sqlx::query_scalar(
                    r#"
                    SELECT session_id
                    FROM commit_session_links
                    WHERE repo_id = ? AND commit_sha = ?
                    "#,
                )
                .bind(repo_id)
                .bind(&source_commit)
                .fetch_all(db)
                .await
                .unwrap_or_default();

                for sid in session_ids {
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO commit_session_links (repo_id, commit_sha, session_id, source, confidence)
                        VALUES (?, ?, ?, 'recovered', 0.8)
                        ON CONFLICT(repo_id, commit_sha, session_id) DO UPDATE SET
                          source = 'recovered',
                          confidence = 0.8,
                          updated_at = CURRENT_TIMESTAMP
                        "#,
                    )
                    .bind(repo_id)
                    .bind(sha)
                    .bind(&sid)
                    .execute(db)
                    .await;
                }
            }
        }

        if write_recovered_notes {
            let _ = export_head_notes(db, repo_id, sha).await;
        }
    }

    Ok(())
}

async fn run_hook(args: Vec<String>) -> Result<(), String> {
    let sub = args.get(2).cloned().unwrap_or_default();
    let repo_root = arg_value(&args, "--repo").ok_or_else(|| "--repo required".to_string())?;
    let db = connect_db().await?;
    let repo_id = ensure_repo_id(&db, &repo_root).await?;

    match sub.as_str() {
        "post-commit" | "post-merge" => {
            let sha = head_sha(&repo_root)?;
            export_head_notes(&db, repo_id, &sha).await?;
            if sub == "post-merge" {
                // Record lineage event (implemented even though optional in the plan)
                let payload = narrative_desktop_mvp::story_anchors::lineage::LineageEventPayload {
                    schema_version:
                        narrative_desktop_mvp::story_anchors::refs::LINEAGE_SCHEMA_VERSION
                            .to_string(),
                    event_type: "merge".to_string(),
                    head_sha: Some(sha.clone()),
                    rewritten_pairs: Vec::new(),
                    rewrite_key_algorithm: "patch-id".to_string(),
                    timestamp_utc: Utc::now().to_rfc3339(),
                };
                let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".into());
                let _ = narrative_desktop_mvp::story_anchors::lineage::record_lineage_event(
                    &db,
                    repo_id,
                    "merge",
                    Some(&sha),
                    &payload_json,
                )
                .await;
                let _ = narrative_desktop_mvp::story_anchors::lineage::write_lineage_note_for_head(
                    &db, repo_id, &sha, &payload,
                )
                .await;
            }
        }
        "post-rewrite" => {
            let cmd = arg_value(&args, "--command").unwrap_or_else(|| "rewrite".into());
            let rewritten_path = arg_value(&args, "--rewritten")
                .ok_or_else(|| "--rewritten required".to_string())?;

            let content = tokio::fs::read_to_string(&rewritten_path)
                .await
                .unwrap_or_default();
            let pairs = content
                .lines()
                .filter_map(|l| {
                    let parts: Vec<&str> = l.split_whitespace().collect();
                    if parts.len() >= 2 {
                        Some((parts[0].to_string(), parts[1].to_string()))
                    } else {
                        None
                    }
                })
                .collect::<Vec<_>>();

            let sha = head_sha(&repo_root).ok();

            let payload = narrative_desktop_mvp::story_anchors::lineage::LineageEventPayload {
                schema_version: narrative_desktop_mvp::story_anchors::refs::LINEAGE_SCHEMA_VERSION
                    .to_string(),
                event_type: cmd.clone(),
                head_sha: sha.clone(),
                rewritten_pairs: pairs.clone(),
                rewrite_key_algorithm: "patch-id".to_string(),
                timestamp_utc: Utc::now().to_rfc3339(),
            };
            let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".into());

            let _ = narrative_desktop_mvp::story_anchors::lineage::record_lineage_event(
                &db,
                repo_id,
                "rewrite",
                sha.as_deref(),
                &payload_json,
            )
            .await;

            if let Some(head) = sha.as_deref() {
                let _ = narrative_desktop_mvp::story_anchors::lineage::write_lineage_note_for_head(
                    &db, repo_id, head, &payload,
                )
                .await;
            }

            let write_recovered = env::var("NARRATIVE_WRITE_RECOVERED_NOTES")
                .ok()
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false);

            // Reconcile newly created commits (the "to" side of pairs)
            let new_shas = pairs.into_iter().map(|(_, to)| to).collect::<Vec<_>>();
            reconcile_commits(&db, repo_id, &repo_root, &new_shas, write_recovered).await?;

            // Finally, export notes for HEAD itself.
            if let Some(head) = sha.as_deref() {
                export_head_notes(&db, repo_id, head).await?;
            }
        }
        _ => usage(),
    }

    Ok(())
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        usage();
    }

    let cmd = args.get(1).cloned().unwrap_or_default();
    let result = match cmd.as_str() {
        "hook" => run_hook(args).await,
        _ => Err("Unknown command".into()),
    };

    if let Err(e) = result {
        eprintln!("narrative-cli error: {e}");
        std::process::exit(1);
    }
}
