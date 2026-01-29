-- Migration 002: Add session_links table
-- Purpose: Support automatic linking between AI sessions and git commits
-- Dependencies: Migration 001 (repos, commits, file_changes tables)

-- UP: Create session_links table
CREATE TABLE IF NOT EXISTS session_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  confidence REAL NOT NULL,
  auto_linked BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(repo_id, session_id),
  FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

-- Index for efficient lookup: find all sessions linked to a commit
CREATE INDEX IF NOT EXISTS idx_session_links_repo_commit ON session_links(repo_id, commit_sha);

-- Index for efficient lookup: find all links for a repo
CREATE INDEX IF NOT EXISTS idx_session_links_repo_id ON session_links(repo_id);

-- DOWN: Rollback migration
DROP INDEX IF EXISTS idx_session_links_repo_id;
DROP INDEX IF EXISTS idx_session_links_repo_commit;
DROP TABLE IF EXISTS session_links;
