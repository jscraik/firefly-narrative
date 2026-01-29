//! Data models for Narrative Desktop MVP
//!
//! This module defines the core data structures used throughout the application.

use serde::{Deserialize, Serialize};

/// A link between an AI session and a git commit.
///
/// Represents an automatic or manual association between a session
/// (from Claude Code, Codex, etc.) and a git commit. The linking
/// algorithm creates these records based on temporal and file overlap
/// scoring.
///
/// # Fields
///
/// * `id` - Auto-incrementing primary key
/// * `repo_id` - Foreign key to the repos table
/// * `session_id` - External session identifier (matches SessionExcerpt.id)
/// * `commit_sha` - The git commit SHA this session links to
/// * `confidence` - Algorithm confidence score (0.0 to 1.0)
/// * `auto_linked` - true if algorithm-suggested, false if manually created
/// * `created_at` - ISO timestamp when link was created
///
/// # Constraints
///
/// * UNIQUE(repo_id, session_id) - One session links to at most one commit (1:1 for MVP)
/// * FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
///
/// # Evidence
///
/// Defined in Migration 002: `src-tauri/migrations/002_add_session_links.sql`
/// Build Plan Epic 2 Story 2.2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLink {
    pub id: i64,
    pub repo_id: i64,
    pub session_id: String,
    pub commit_sha: String,
    pub confidence: f64,
    pub auto_linked: bool,
    pub created_at: String,
}

/// A pending session import that hasn't been linked yet.
///
/// When a session file is imported but no commit meets the confidence
/// threshold (0.7), it's stored as unlinked. The user can manually link
/// it later (P2 feature) or re-import after the algorithm is improved.
///
/// # Evidence
///
/// UX Spec Section 5 (State Design) defines "Unlinked" state.
/// Build Plan Epic 5 Story 5.4
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnlinkedSession {
    pub repo_id: i64,
    pub session_id: String,
    pub reason: UnlinkedReason,
}

/// Why a session failed to auto-link to a commit.
///
/// # Evidence
///
/// Build Plan Epic 3 Story 3.4 defines error handling.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UnlinkedReason {
    /// No commits found in the session's time window.
    NoCommitsInTimeWindow,

    /// All commits scored below the confidence threshold (0.7).
    LowConfidence,

    /// Session file parsing failed (malformed JSON, missing fields).
    ParseError(String),
}

/// A test case result from a test run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestCase {
    pub id: String,
    pub name: String,
    pub status: TestStatus,
    pub duration_ms: u64,
    pub error_message: Option<String>,
    pub file_path: Option<String>,
}

/// Status of a single test case.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TestStatus {
    Passed,
    Failed,
    Skipped,
}

/// A test run associated with a session or commit.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestRun {
    pub id: String,
    pub session_id: Option<String>,
    pub commit_sha: Option<String>,
    pub at_iso: String,
    pub duration_sec: f64,
    pub passed: u32,
    pub failed: u32,
    pub skipped: u32,
    pub tests: Vec<TestCase>,
}

/// A badge shown on timeline nodes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineBadge {
    pub badge_type: BadgeType,
    pub label: String,
    pub status: Option<BadgeStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BadgeType {
    File,
    Test,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BadgeStatus {
    Passed,
    Failed,
    Mixed,
}
