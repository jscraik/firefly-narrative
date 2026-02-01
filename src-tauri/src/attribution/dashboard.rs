//! Dashboard analytics module
//!
//! Provides aggregated statistics for the dashboard view.
//! Uses precomputed stats from commit_stats_snapshot table for fast queries.

use serde::{Deserialize, Serialize};

// =============================================================================
// Types
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub repo: RepoInfo,
    pub time_range: TimeRange,
    pub current_period: PeriodStats,
    pub previous_period: Option<PeriodStats>,
    pub top_files: PaginatedFiles,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub id: i64,
    pub path: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TimeRange {
    Preset(TimeRangePreset),
    Custom { from: String, to: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TimeRangePreset {
    #[serde(rename = "7d")]
    SevenDays,
    #[serde(rename = "30d")]
    ThirtyDays,
    #[serde(rename = "90d")]
    NinetyDays,
    #[serde(rename = "all")]
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodStats {
    pub period: Period,
    pub attribution: PeriodAttribution,
    pub tool_breakdown: Vec<ToolStats>,
    pub trend: Vec<TrendPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Period {
    pub start: String,
    pub end: String,
    pub commits: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodAttribution {
    pub total_lines: i64,
    pub human_lines: i64,
    pub ai_agent_lines: i64,
    pub ai_assist_lines: i64,
    pub collaborative_lines: i64,
    pub ai_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStats {
    pub tool: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    pub line_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendPoint {
    pub date: String,
    pub granularity: TrendGranularity,
    pub ai_percentage: f64,
    pub commit_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TrendGranularity {
    #[serde(rename = "hour")]
    Hour,
    #[serde(rename = "day")]
    Day,
    #[serde(rename = "week")]
    Week,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedFiles {
    pub files: Vec<FileStats>,
    pub total: i64,
    pub offset: i64,
    pub limit: i64,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStats {
    pub file_path: String,
    pub total_lines: i64,
    pub ai_lines: i64,
    pub ai_percentage: f64,
    pub commit_count: i64,
}

// =============================================================================
// Tauri Command
// =============================================================================

/// Get complete dashboard stats in a single call.
///
/// Uses precomputed snapshot table for fast queries.
/// Returns current period stats, previous period for comparison,
/// and top AI-contributed files (paginated).
#[tauri::command]
pub async fn get_dashboard_stats(
    repo_id: i64,
    time_range: TimeRange,
    files_offset: i64,
    files_limit: i64,
) -> Result<DashboardStats, String> {
    // TODO: Implement real queries against commit_stats_snapshot table
    // For now, return mock data that matches the Zod schema

    let mock = mock_dashboard_stats(repo_id, time_range, files_offset, files_limit);
    Ok(mock)
}

// =============================================================================
// Mock Data (for development - remove in Phase 4)
// ============================================================================

fn mock_dashboard_stats(
    repo_id: i64,
    time_range: TimeRange,
    files_offset: i64,
    files_limit: i64,
) -> DashboardStats {
    DashboardStats {
        repo: RepoInfo {
            id: repo_id,
            path: "/Users/dev/narrative".to_string(),
            name: "narrative".to_string(),
        },
        time_range,
        current_period: PeriodStats {
            period: Period {
                start: "2026-01-01".to_string(),
                end: "2026-01-31".to_string(),
                commits: 42,
            },
            attribution: PeriodAttribution {
                total_lines: 15000,
                human_lines: 8250,
                ai_agent_lines: 4500,
                ai_assist_lines: 2250,
                collaborative_lines: 1500,
                ai_percentage: 45.0,
            },
            tool_breakdown: vec![
                ToolStats {
                    tool: "claude_code".to_string(),
                    model: Some("claude-3-5-sonnet".to_string()),
                    line_count: 5000,
                },
                ToolStats {
                    tool: "cursor".to_string(),
                    model: Some("gpt-4".to_string()),
                    line_count: 1750,
                },
            ],
            trend: vec![
                TrendPoint {
                    date: "2026-01-01".to_string(),
                    granularity: TrendGranularity::Day,
                    ai_percentage: 38.0,
                    commit_count: 5,
                },
                TrendPoint {
                    date: "2026-01-08".to_string(),
                    granularity: TrendGranularity::Day,
                    ai_percentage: 42.0,
                    commit_count: 8,
                },
                TrendPoint {
                    date: "2026-01-15".to_string(),
                    granularity: TrendGranularity::Day,
                    ai_percentage: 45.0,
                    commit_count: 12,
                },
                TrendPoint {
                    date: "2026-01-22".to_string(),
                    granularity: TrendGranularity::Day,
                    ai_percentage: 48.0,
                    commit_count: 10,
                },
                TrendPoint {
                    date: "2026-01-29".to_string(),
                    granularity: TrendGranularity::Day,
                    ai_percentage: 52.0,
                    commit_count: 7,
                },
            ],
        },
        previous_period: Some(PeriodStats {
            period: Period {
                start: "2025-12-01".to_string(),
                end: "2025-12-31".to_string(),
                commits: 38,
            },
            attribution: PeriodAttribution {
                total_lines: 12000,
                human_lines: 7200,
                ai_agent_lines: 3000,
                ai_assist_lines: 1800,
                collaborative_lines: 1200,
                ai_percentage: 40.0,
            },
            tool_breakdown: vec![
                ToolStats {
                    tool: "claude_code".to_string(),
                    model: Some("claude-3-5-sonnet".to_string()),
                    line_count: 3500,
                },
                ToolStats {
                    tool: "cursor".to_string(),
                    model: Some("gpt-4".to_string()),
                    line_count: 1300,
                },
            ],
            trend: vec![],
        }),
        top_files: PaginatedFiles {
            files: vec![
                FileStats {
                    file_path: "src/core/attribution-api.ts".to_string(),
                    total_lines: 350,
                    ai_lines: 280,
                    ai_percentage: 80.0,
                    commit_count: 5,
                },
                FileStats {
                    file_path: "src/ui/views/DashboardView.tsx".to_string(),
                    total_lines: 250,
                    ai_lines: 175,
                    ai_percentage: 70.0,
                    commit_count: 3,
                },
                FileStats {
                    file_path: "src-tauri/src/attribution/dashboard.rs".to_string(),
                    total_lines: 180,
                    ai_lines: 90,
                    ai_percentage: 50.0,
                    commit_count: 2,
                },
            ],
            total: 15,
            offset: files_offset,
            limit: files_limit,
            has_more: files_offset + files_limit < 15,
        },
    }
}
