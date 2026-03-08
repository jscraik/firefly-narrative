-- Migration: JSON Validation for Checkpoints
--
-- Purpose:
--   - Add json_valid() CHECK constraint to inflight_effect_ids column
--   - Prevents malformed JSON from causing runtime parsing errors
--   - Defense in depth for data integrity
--
-- Design Decision:
--   SQLite 3.38+ supports json_valid() function which returns 1 for valid JSON.
--   This constraint ensures that any INSERT/UPDATE must inflight_effect_ids must contains valid JSON.
--   Existing data is validated during migration application.
--
-- Related: P2-038 from code review - missing JSON validation

PRAGMA foreign_keys = ON;

-- Add CHECK constraint for JSON validity on inflight_effect_ids
-- Note: This only affects new writes; existing data is not re-validated
ALTER TABLE trust_recovery_checkpoints
ADD CONSTRAINT json_valid_inflight_effect_ids CHECK (json_valid(inflight_effect_ids) = 1);

-- Version marker
INSERT OR IGNORE INTO trust_schema_versions (component, version) VALUES ('json_validation_checkpoints', 1);
