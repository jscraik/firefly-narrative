-- Migration: Session Attribution Tracking
-- Phase 1 (MVP): Session-level contribution stats
-- Phase 2: Line-level attribution with compressed ranges

-- Create sessions table for imported AI sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,  -- Deterministic session ID (hash of tool:original_id)
    repo_id INTEGER NOT NULL,
    tool TEXT NOT NULL,     -- e.g., 'claude_code'
    model TEXT,              -- e.g., 'claude-4-opus-20250129'
    checkpoint_kind TEXT DEFAULT 'ai_agent'
        CHECK(checkpoint_kind IN ('human', 'ai_agent', 'ai_assist')),
    imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    duration_min INTEGER,
    message_count INTEGER DEFAULT 0,
    files TEXT,               -- JSON array of files touched
    raw_json TEXT NOT NULL,  -- Full session trace data
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_repo ON sessions(repo_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tool ON sessions(tool);

-- Pre-computed commit contribution statistics (MVP: session-level)
-- This provides fast lookup of AI contribution metrics per commit
CREATE TABLE commit_contribution_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    -- Session-level stats (MVP)
    ai_agent_lines INTEGER DEFAULT 0,
    ai_assist_lines INTEGER DEFAULT 0,
    human_lines INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    ai_percentage INTEGER DEFAULT 0 CHECK(ai_percentage BETWEEN 0 AND 100),
    -- Metadata for quick display
    primary_session_id TEXT,  -- The main AI session for this commit
    tool TEXT,                -- Tool name (e.g., 'claude_code')
    model TEXT,               -- Model name (e.g., 'claude-4-opus')
    computed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
    FOREIGN KEY (primary_session_id) REFERENCES sessions(id) ON DELETE SET NULL,
    UNIQUE(repo_id, commit_sha)
);

-- Indexes for efficient queries
CREATE INDEX idx_commit_stats_repo ON commit_contribution_stats(repo_id, commit_sha);
CREATE INDEX idx_commit_stats_session ON commit_contribution_stats(primary_session_id);
CREATE INDEX idx_commit_stats_tool ON commit_contribution_stats(repo_id, tool);

-- Tool breakdown per commit (Phase 2)
-- For detailed statistics when multiple tools contributed
CREATE TABLE commit_tool_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    tool TEXT NOT NULL,
    model TEXT,
    line_count INTEGER DEFAULT 0,
    
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX idx_tool_stats_repo ON commit_tool_stats(repo_id, commit_sha);
CREATE INDEX idx_tool_stats_tool ON commit_tool_stats(repo_id, tool);

-- Compressed line ranges for Phase 2 (line-level attribution)
-- Uses run-length encoding for efficient storage
-- Format: [start_line, length, kind_code, session_hash, ...]
CREATE TABLE contribution_ranges_compressed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    file_path TEXT NOT NULL,
    encoded_data BLOB NOT NULL,  -- RLE encoded ranges
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
    UNIQUE(repo_id, commit_sha, file_path)
);

CREATE INDEX idx_contrib_ranges_commit ON contribution_ranges_compressed(repo_id, commit_sha);
CREATE INDEX idx_contrib_ranges_file ON contribution_ranges_compressed(repo_id, file_path);

-- Import audit log for tracking and debugging
CREATE TABLE session_import_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    session_id TEXT,
    status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
    warnings TEXT,  -- JSON array of warning messages
    error_message TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX idx_import_log_repo ON session_import_log(repo_id);
CREATE INDEX idx_import_log_session ON session_import_log(session_id);
