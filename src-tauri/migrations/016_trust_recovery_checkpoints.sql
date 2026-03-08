CREATE TABLE IF NOT EXISTS trust_recovery_checkpoints (
  thread_id TEXT PRIMARY KEY NOT NULL,
  last_applied_event_seq INTEGER,
  replay_cursor TEXT,
  inflight_effect_ids TEXT NOT NULL DEFAULT '[]',
  checkpoint_written_at_iso TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_trust_recovery_checkpoints_written_at
  ON trust_recovery_checkpoints(checkpoint_written_at_iso DESC);
