-- Migration: Attribution Notes + Source Lens
-- Adds line-level attribution storage and note-sync metadata

PRAGMA foreign_keys = ON;

-- Extend sessions with conversation metadata + trace visibility
ALTER TABLE sessions ADD COLUMN conversation_id TEXT;
ALTER TABLE sessions ADD COLUMN trace_available INTEGER NOT NULL DEFAULT 1
    CHECK(trace_available IN (0, 1));

-- Line-level attribution (ranges) with optional tool/model metadata
CREATE TABLE IF NOT EXISTS line_attributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    file_path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    session_id TEXT,
    author_type TEXT NOT NULL CHECK(author_type IN ('human', 'ai_agent', 'ai_tab', 'mixed')),
    ai_percentage REAL,
    tool TEXT,
    model TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_line_attributions_commit ON line_attributions(repo_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_line_attributions_file ON line_attributions(repo_id, file_path);
CREATE INDEX IF NOT EXISTS idx_line_attributions_session ON line_attributions(session_id);
