-- Test runs + test cases imported from external systems (e.g. CI).
-- Stored per repo + commit for truthful, auditable display in the UI.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY,
  repo_id INTEGER NOT NULL,
  commit_sha TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'junit',
  imported_at TEXT NOT NULL,
  source_basename TEXT NOT NULL,
  raw_rel_path TEXT NOT NULL,
  duration_sec REAL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  skipped INTEGER NOT NULL,
  FOREIGN KEY(repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_runs_repo_commit ON test_runs(repo_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_test_runs_repo_imported_at ON test_runs(repo_id, imported_at);

CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  file_path TEXT,
  FOREIGN KEY(run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_cases_run_id ON test_cases(run_id);

