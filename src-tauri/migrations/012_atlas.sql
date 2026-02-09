-- Migration 012: Atlas (derived lexical index over sessions.raw_json)
-- - atlas_chunks: deterministic derived projection (stable chunk_uid)
-- - atlas_chunks_fts: FTS5 index over atlas_chunks.text with token-prefix support
-- - atlas_index_state: per-repo derived index state (doctor/introspection)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_uid TEXT NOT NULL UNIQUE,
  repo_id INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  start_message_index INTEGER NOT NULL,
  end_message_index INTEGER NOT NULL,
  role_mask TEXT NOT NULL,
  text TEXT NOT NULL,
  session_imported_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE (repo_id, session_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_atlas_chunks_repo_session
  ON atlas_chunks(repo_id, session_id);

CREATE INDEX IF NOT EXISTS idx_atlas_chunks_repo_imported
  ON atlas_chunks(repo_id, session_imported_at);

CREATE TABLE IF NOT EXISTS atlas_index_state (
  repo_id INTEGER PRIMARY KEY,
  derived_version TEXT NOT NULL,
  last_rebuild_at TEXT,
  last_updated_at TEXT,
  last_error TEXT,
  sessions_indexed INTEGER NOT NULL DEFAULT 0,
  chunks_indexed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS atlas_chunks_fts USING fts5(
  text,
  content='atlas_chunks',
  content_rowid='id',
  tokenize='unicode61',
  prefix='2 3 4'
);

CREATE TRIGGER IF NOT EXISTS atlas_chunks_ai AFTER INSERT ON atlas_chunks BEGIN
  INSERT INTO atlas_chunks_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS atlas_chunks_ad AFTER DELETE ON atlas_chunks BEGIN
  INSERT INTO atlas_chunks_fts(atlas_chunks_fts, rowid, text)
  VALUES ('delete', old.id, old.text);
END;

CREATE TRIGGER IF NOT EXISTS atlas_chunks_au AFTER UPDATE ON atlas_chunks BEGIN
  INSERT INTO atlas_chunks_fts(atlas_chunks_fts, rowid, text)
  VALUES ('delete', old.id, old.text);
  INSERT INTO atlas_chunks_fts(rowid, text) VALUES (new.id, new.text);
END;