//! Data models for Narrative Desktop MVP
//!
//! This module defines the core data structures used throughout the application.

use serde::{Deserialize, Serialize};
use sqlx::FromRow;

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
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SessionLink {
    pub id: i64,
    pub repo_id: i64,
    pub session_id: String,
    pub commit_sha: String,
    pub confidence: f64,
    pub auto_linked: bool,
    pub created_at: String,
}
