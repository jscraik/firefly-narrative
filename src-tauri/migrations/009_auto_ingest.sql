-- Migration 009: Auto-ingest metadata + audit log
-- Adds ingestion metadata to sessions and links, plus audit log tracking.

ALTER TABLE sessions ADD COLUMN source_path TEXT;
ALTER TABLE sessions ADD COLUMN source_session_id TEXT;
ALTER TABLE sessions ADD COLUMN redaction_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN redaction_types TEXT;
ALTER TABLE sessions ADD COLUMN dedupe_key TEXT;
ALTER TABLE sessions ADD COLUMN purged_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_repo_dedupe
  ON sessions(repo_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Ensure session_links exists for older DBs before altering
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

CREATE INDEX IF NOT EXISTS idx_session_links_repo_commit ON session_links(repo_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_session_links_repo_id ON session_links(repo_id);

ALTER TABLE session_links ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ingest_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  source_tool TEXT NOT NULL,
  source_path TEXT,
  session_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('imported', 'skipped', 'failed')),
  redaction_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ingest_audit_repo ON ingest_audit_log(repo_id);
CREATE INDEX IF NOT EXISTS idx_ingest_audit_session ON ingest_audit_log(session_id);
