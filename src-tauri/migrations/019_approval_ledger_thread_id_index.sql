-- Migration: Approval Ledger Thread ID Index
--
-- Purpose:
--   - Add index on thread_id for approval ledger queries
--   - Document that thread_id references externally-managed threads (Codex runtime)
--   - Note: No FK constraint possible as threads table does not exist in this database
--
-- Design Decision:
--   thread_id references threads managed by the Codex app server runtime, not a
--   local threads table. Thread lifecycle (creation, cleanup) is managed externally.
--   This index enables efficient queries by thread_id for conflict detection and
--   per-thread approval lookups.
--
-- Related: P1-036 from code review - missing thread_id index

PRAGMA foreign_keys = ON;

-- Index for thread_id lookups (conflict detection, per-thread queries)
CREATE INDEX IF NOT EXISTS idx_approval_decisions_thread_id ON trust_approval_decisions(thread_id);

-- Composite index for active approval lookups by thread (tombstone=0 is common filter)
CREATE INDEX IF NOT EXISTS idx_approval_decisions_thread_active ON trust_approval_decisions(thread_id, tombstone) WHERE tombstone = 0;

-- Version marker
INSERT OR IGNORE INTO trust_schema_versions (component, version) VALUES ('approval_ledger_thread_id_index', 1);
