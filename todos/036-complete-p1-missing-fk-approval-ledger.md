---
status: complete
priority: p1
issue_id: 036
tags:
  - code-review
  - database
  - schema
  - data-integrity
dependencies: []
---

# Problem Statement

The `trust_approval_decisions` table lacks a foreign key constraint on `thread_id`, allowing orphaned approval records if thread cleanup doesn't cascade properly.

## Impact

- **Severity**: P1 (Critical - Blocks Merge)
- **Type**: Data Integrity
- **Risk**: Orphaned records, database bloat, inconsistent queries

# Findings

**Location**: `src-tauri/migrations/017_approval_ledger.sql:31`

```sql
CREATE TABLE IF NOT EXISTS trust_approval_decisions (
    request_id TEXT PRIMARY KEY NOT NULL,
    thread_id TEXT NOT NULL,
    -- ... no FK constraint
);
```

**Issue**:
- `thread_id` references external threads but has no FK constraint
- Orphaned records possible if thread is deleted
- Related: `trust_recovery_checkpoints` also uses `thread_id` without FK (as PRIMARY KEY, so self-contained)

**Evidence from Rust code**:
- `approval_ledger.rs` queries by `thread_id` in conflict detection
- No application-level cascade cleanup exists

# Proposed Solutions

## Option A: Add FK constraint with migration (Recommended)

**Pros**:
- Database enforces integrity
- Automatic cascade behavior
- Standard practice

**Cons**:
- Requires new migration
- Need to verify threads table exists

**Effort**: Small
**Risk**: Low

```sql
-- New migration 019
ALTER TABLE trust_approval_decisions
ADD COLUMN thread_id_ref TEXT;

UPDATE trust_approval_decisions
SET thread_id_ref = thread_id;

ALTER TABLE trust_approval_decisions
DROP COLUMN thread_id;

ALTER TABLE trust_approval_decisions
RENAME COLUMN thread_id_ref TO thread_id;

-- If threads table exists:
ALTER TABLE trust_approval_decisions
ADD CONSTRAINT fk_approval_thread
FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;
```

## Option B: Add index + application-level cleanup

**Pros**:
- No schema dependency on threads table
- Works if threads are externally managed

**Cons**:
- Manual cleanup code needed
- Risk of missed cleanup

**Effort**: Medium
**Risk**: Medium

```sql
CREATE INDEX idx_approval_decisions_thread_id
ON trust_approval_decisions(thread_id);
```

```rust
// Add cleanup in appropriate location
pub async fn cleanup_thread_approvals(thread_id: &str) -> Result<()> {
    sqlx::query("DELETE FROM trust_approval_decisions WHERE thread_id = ?")
        .bind(thread_id)
        .execute(&pool)
        .await?;
    Ok(())
}
```

## Option C: Document as intentional design

**Pros**:
- No code change
- Fast resolution

**Cons**:
- Doesn't address data integrity risk
- Requires documentation effort

**Effort**: Small
**Risk**: High (accepts risk)

# Recommended Action

**Option A** if threads table exists in this database. **Option B** if threads are externally managed (Codex runtime). Verify which applies before choosing.

# Technical Details

**Affected Files**:
- `src-tauri/migrations/017_approval_ledger.sql` (existing)
- New migration file needed for Option A

**Related Tables**:
- `trust_recovery_checkpoints` (also uses thread_id as PK)
- `trust_approval_decisions` (uses thread_id as non-FK column)

# Acceptance Criteria

- [ ] Determine if threads table exists in this database
- [ ] If yes: Add FK constraint with new migration
- [ ] If no: Add index on thread_id + document thread lifecycle
- [ ] Add integration test for orphan prevention
- [ ] Document thread lifecycle management strategy

# Work Log

_2026-03-08_: Initial finding from schema drift review

# Resources

- [SQLite Foreign Key Support](https://www.sqlite.org/foreignkeys.html)
- [Database Schema Design Best Practices](https://use-the-index-luke.com/sql/schema)
