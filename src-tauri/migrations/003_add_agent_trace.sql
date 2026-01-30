-- Migration 003: Add agent trace tables
-- Purpose: Support AI attribution trace tracking
-- Dependencies: None

-- Main trace records table
CREATE TABLE IF NOT EXISTS trace_records (
  id TEXT PRIMARY KEY,
  repo_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  vcs_type TEXT NOT NULL,
  revision TEXT NOT NULL,
  tool_name TEXT,
  tool_version TEXT,
  metadata_json TEXT,
  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trace_records_repo ON trace_records(repo_id);
CREATE INDEX IF NOT EXISTS idx_trace_records_revision ON trace_records(revision);

-- Files within trace records
CREATE TABLE IF NOT EXISTS trace_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT NOT NULL,
  path TEXT NOT NULL,
  FOREIGN KEY (record_id) REFERENCES trace_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trace_files_record ON trace_files(record_id);
CREATE INDEX IF NOT EXISTS idx_trace_files_path ON trace_files(path);

-- Conversations within files
CREATE TABLE IF NOT EXISTS trace_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL,
  url TEXT,
  contributor_type TEXT,
  model_id TEXT,
  FOREIGN KEY (file_id) REFERENCES trace_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trace_conv_file ON trace_conversations(file_id);

-- Line ranges within conversations
CREATE TABLE IF NOT EXISTS trace_ranges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content_hash TEXT,
  contributor_type TEXT,
  model_id TEXT,
  FOREIGN KEY (conversation_id) REFERENCES trace_conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trace_ranges_conv ON trace_ranges(conversation_id);
