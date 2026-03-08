---
status: pending
priority: p2
issue_id: 038
tags:
  - code-review
  - schema
  - json
  - data-integrity
dependencies: []
---

# Problem Statement

The `inflight_effect_ids` column stores JSON as TEXT without schema validation, risking malformed JSON causing runtime errors.

## Impact

- **Severity**: P2 (Important - Should Fix)
- **Type**: Data Integrity
- **Risk**: Runtime parsing failures, corrupted state

# Findings

**Location**: `src-tauri/migrations/016_trust_recovery_checkpoints.sql:3-4`

```sql
inflight_effect_ids TEXT NOT NULL DEFAULT '[]',
```

**Rust parsing** at `src-tauri/src/recovery_checkpoint.rs:369-373`:

```rust
let inflight_raw = row
    .try_get::<String, _>("inflight_effect_ids")
    .map_err(|e| format!("failed to read checkpoint inflight_effect_ids: {e}"))?;
let inflight_effect_ids: Vec<String> = serde_json::from_str(&inflight_raw)
    .map_err(|e| format!("failed to parse checkpoint inflight_effect_ids: {e}"))?;
```

**Issue**:
- No CHECK constraint for JSON validity
- Corrupted data could break parsing
- Malicious data injection could cause crashes

# Proposed Solutions

## Option A: Add SQLite json_valid() CHECK constraint (Recommended)

**Pros**:
- Database enforces JSON validity
- Prevents all malformed inserts
- SQLite 3.38+ supports this

**Cons**:
- Requires migration

**Effort**: Small
**Risk**: Low

```sql
-- New migration or alter
ALTER TABLE trust_recovery_checkpoints
ADD CHECK (json_valid(inflight_effect_ids));

-- For new tables:
inflight_effect_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(inflight_effect_ids)),
```

## Option B: Add size limit validation in Rust

**Pros**:
- Application-layer control
- Can provide better error context

**Cons**:
- Doesn't prevent all corruption paths
- More code

**Effort**: Small
**Risk**: Low

```rust
if inflight_effect_ids.len() > 1000 {
    return Err("inflight_effect_ids exceeds maximum size".to_string());
}
```

# Recommended Action

**Option A** for schema validation. Add Option B for defense in depth.

# Technical Details

**Affected Files**:
- `src-tauri/migrations/016_trust_recovery_checkpoints.sql`
- `src-tauri/src/recovery_checkpoint.rs`

# Acceptance Criteria

- [ ] Add CHECK constraint `json_valid(inflight_effect_ids)`
- [ ] Verify existing data passes constraint
- [ ] Add test for malformed JSON handling
- [ ] Add size limit validation in Rust (optional defense in depth)

# Work Log

_2026-03-08_: Initial finding from schema drift review

# Resources

- [SQLite JSON Functions](https://www.sqlite.org/json1.html#jvalid)
