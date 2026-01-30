//! Session-level contribution statistics computation
//!
//! MVP implementation: Computes stats from linked session metadata
//! Phase 2: Will compute from line-level attribution

use super::models::{ContributionStats, ToolStats};
use crate::linking::SessionExcerpt;

/// Compute contribution stats from a linked session
///
/// MVP: Uses session message count and file overlap as proxies for contribution
/// Phase 2: Will use actual line-level attribution
pub fn compute_session_contribution(
    session: &SessionExcerpt,
    commit_files: &[String],
) -> ContributionStats {
    // Count messages as proxy for contribution size
    let message_count = session.messages.len() as u32;

    // Estimate lines from message content (rough heuristic)
    let estimated_lines = message_count * 10; // Assume ~10 lines per message interaction

    // Calculate file overlap
    let session_files: Vec<&str> = session
        .messages
        .iter()
        .filter_map(|m| m.files.as_ref())
        .flatten()
        .map(|f| f.as_str())
        .collect();

    let overlap_count = commit_files
        .iter()
        .filter(|cf| session_files.contains(&cf.as_str()))
        .count() as u32;

    // If there's file overlap, attribute the commit to the session
    let ai_lines = if overlap_count > 0 {
        estimated_lines.max(commit_files.len() as u32 * 5)
    } else {
        // No file overlap, but session exists - partial attribution
        estimated_lines / 2
    };

    // For MVP, assume all AI lines are from the session's tool
    let tool = session.tool.to_string();

    ContributionStats {
        human_lines: 0,
        ai_agent_lines: ai_lines,
        ai_assist_lines: 0,
        collaborative_lines: 0,
        total_lines: ai_lines,
        ai_percentage: 100.0,
        tool_breakdown: Some(vec![ToolStats {
            tool: tool.clone(),
            model: None, // Will be populated from session_details
            line_count: ai_lines,
        }]),
        primary_tool: Some(tool),
        model: None,
    }
}

/// Compute stats when no session is linked (human-authored)
pub fn compute_human_contribution(total_lines: u32) -> ContributionStats {
    ContributionStats::human_only(total_lines)
}

/// Store computed stats in database
pub async fn store_contribution_stats(
    db: &sqlx::SqlitePool,
    repo_id: i64,
    commit_sha: &str,
    session_id: Option<&str>,
    stats: &ContributionStats,
) -> Result<(), sqlx::Error> {
    use sqlx::query;

    // Insert or update stats
    query(
        r#"
        INSERT INTO commit_contribution_stats 
            (repo_id, commit_sha, human_lines, ai_agent_lines, ai_assist_lines, 
             collaborative_lines, total_lines, ai_percentage, primary_session_id, tool, model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(repo_id, commit_sha) DO UPDATE SET
            human_lines = excluded.human_lines,
            ai_agent_lines = excluded.ai_agent_lines,
            ai_assist_lines = excluded.ai_assist_lines,
            collaborative_lines = excluded.collaborative_lines,
            total_lines = excluded.total_lines,
            ai_percentage = excluded.ai_percentage,
            primary_session_id = COALESCE(excluded.primary_session_id, commit_contribution_stats.primary_session_id),
            tool = COALESCE(excluded.tool, commit_contribution_stats.tool),
            model = COALESCE(excluded.model, commit_contribution_stats.model),
            computed_at = datetime('now')
        "#
    )
    .bind(repo_id)
    .bind(commit_sha)
    .bind(stats.human_lines as i32)
    .bind(stats.ai_agent_lines as i32)
    .bind(stats.ai_assist_lines as i32)
    .bind(stats.collaborative_lines as i32)
    .bind(stats.total_lines as i32)
    .bind(stats.ai_percentage as i32)
    .bind(session_id)
    .bind(&stats.primary_tool)
    .bind(&stats.model)
    .execute(db)
    .await?;

    // Store tool breakdown if present
    if let Some(ref breakdown) = stats.tool_breakdown {
        // Clear old breakdown
        query("DELETE FROM commit_tool_stats WHERE repo_id = ? AND commit_sha = ?")
            .bind(repo_id)
            .bind(commit_sha)
            .execute(db)
            .await?;

        // Insert new breakdown
        for tool_stat in breakdown {
            query(
                r#"
                INSERT INTO commit_tool_stats (repo_id, commit_sha, tool, model, line_count)
                VALUES (?, ?, ?, ?, ?)
                "#,
            )
            .bind(repo_id)
            .bind(commit_sha)
            .bind(&tool_stat.tool)
            .bind(&tool_stat.model)
            .bind(tool_stat.line_count as i32)
            .execute(db)
            .await?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::linking::{SessionExcerpt, SessionMessage, SessionMessageRole, SessionTool};

    fn create_test_session() -> SessionExcerpt {
        SessionExcerpt {
            id: "test-session".to_string(),
            tool: SessionTool::ClaudeCode,
            duration_min: Some(30),
            imported_at_iso: "2024-01-15T10:00:00Z".to_string(),
            messages: vec![
                SessionMessage {
                    id: "1".to_string(),
                    role: SessionMessageRole::User,
                    text: "Hello".to_string(),
                    files: Some(vec!["src/main.rs".to_string()]),
                },
                SessionMessage {
                    id: "2".to_string(),
                    role: SessionMessageRole::Assistant,
                    text: "Hi!".to_string(),
                    files: None,
                },
            ],
        }
    }

    #[test]
    fn test_compute_session_contribution() {
        let session = create_test_session();
        let commit_files = vec!["src/main.rs".to_string()];

        let stats = compute_session_contribution(&session, &commit_files);

        assert!(stats.ai_agent_lines > 0);
        assert_eq!(stats.ai_percentage, 100.0);
        assert!(stats.primary_tool.is_some());
    }

    #[test]
    fn test_compute_human_contribution() {
        let stats = compute_human_contribution(100);

        assert_eq!(stats.human_lines, 100);
        assert_eq!(stats.ai_percentage, 0.0);
    }
}
