-- Narrative MVP schema (very small, intended for caching/indexing)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_opened_at TEXT
);

CREATE TABLE IF NOT EXISTS commits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  sha TEXT NOT NULL,
  author TEXT,
  authored_at TEXT,
  subject TEXT,
  body TEXT,
  inserted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(repo_id, sha),
  FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS file_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  commit_sha TEXT NOT NULL,
  path TEXT NOT NULL,
  additions INTEGER NOT NULL,
  deletions INTEGER NOT NULL,
  UNIQUE(repo_id, commit_sha, path),
  FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commits_repo_authored ON commits(repo_id, authored_at);
CREATE INDEX IF NOT EXISTS idx_file_changes_repo_commit ON file_changes(repo_id, commit_sha);
