-- Migration: Story Anchors (Git Notes-backed session links + lineage events)
--
-- Purpose:
-- - Track Git Notes import/export metadata for Narrative-native refs:
--   - refs/notes/narrative/attribution
--   - refs/notes/narrative/sessions
--   - refs/notes/narrative/lineage
-- - Cache commit↔session links imported from notes (separate from heuristic session_links)
-- - Persist rewrite/lineage events captured from git hooks (optional but implemented)

PRAGMA foreign_keys = ON;

-- Generic note metadata (works for attribution + sessions + lineage)
CREATE TABLE IF NOT EXISTS story_anchor_note_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    note_kind TEXT NOT NULL CHECK(note_kind IN ('attribution', 'sessions', 'lineage')),
    note_ref TEXT NOT NULL,
    note_hash TEXT NOT NULL,
    schema_version TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(repo_id, commit_sha, note_kind, note_ref),
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_anchor_note_meta_commit
  ON story_anchor_note_meta(repo_id, commit_sha, note_kind);
CREATE INDEX IF NOT EXISTS idx_story_anchor_note_meta_hash
  ON story_anchor_note_meta(note_hash);

-- Commit↔session links imported from Git Notes (Story Anchors).
CREATE TABLE IF NOT EXISTS commit_session_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    commit_sha TEXT NOT NULL,
    session_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'notes' CHECK(source IN ('notes', 'recovered')),
    confidence REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(repo_id, commit_sha, session_id),
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commit_session_links_commit
  ON commit_session_links(repo_id, commit_sha);
CREATE INDEX IF NOT EXISTS idx_commit_session_links_session
  ON commit_session_links(repo_id, session_id);

-- Persist lineage events captured from git hooks (post-rewrite, post-merge).
CREATE TABLE IF NOT EXISTS lineage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('rebase', 'cherry_pick', 'squash', 'merge', 'amend', 'reset', 'rewrite')),
    head_sha TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lineage_events_repo_time
  ON lineage_events(repo_id, created_at);

