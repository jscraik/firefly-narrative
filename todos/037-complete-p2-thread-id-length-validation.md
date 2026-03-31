---
status: complete
priority: p2
issue_id: 037
tags:
  - code-review
  - security
  - input-validation
  - dos
dependencies: []
---

# Problem Statement

Thread ID input lacks maximum length validation, allowing extremely long strings that could cause database bloat or memory exhaustion.

## Impact

- **Severity**: P2 (Important - Should Fix)
- **CWE**: CWE-20 (Improper Input Validation), CWE-400 (Uncontrolled Resource Consumption)
- **Risk**: DoS via storage/memory exhaustion

# Findings

**Location**: `src-tauri/src/recovery_checkpoint.rs:350-355`

```rust
fn normalize_thread_id(thread_id: &str) -> Result<String, String> {
    let normalized = thread_id.trim();
    if normalized.is_empty() {
        return Err("trust recovery checkpoint requires non-empty thread_id".to_string());
    }
    Ok(normalized.to_string())
}
```

**Issue**:
- Only validates non-empty
- No maximum length check
- Thread ID is stored in `trust_recovery_checkpoints.thread_id` PRIMARY KEY
- Thread ID used in `trust_approval_decisions.thread_id` column

**Attack Vector**:
- Attacker provides 1MB+ thread ID string
- Database bloat (stored in multiple tables)
- Memory exhaustion in string operations
- Potential query performance degradation

# Proposed Solutions

## Option A: Add length validation with reasonable limit (Recommended)

**Pros**:
- Simple fix
- Prevents DoS vector
- Clear error message

**Cons**:
- May need to coordinate with external thread ID format

**Effort**: Small
**Risk**: Low

```rust
const MAX_THREAD_ID_LENGTH: usize = 256;

fn normalize_thread_id(thread_id: &str) -> Result<String, String> {
    let normalized = thread_id.trim();
    if normalized.is_empty() {
        return Err("trust recovery checkpoint requires non-empty thread_id".to_string());
    }
    if normalized.len() > MAX_THREAD_ID_LENGTH {
        return Err(format!(
            "thread_id exceeds maximum length of {} bytes",
            MAX_THREAD_ID_LENGTH
        ));
    }
    Ok(normalized.to_string())
}
```

## Option B: Add schema-level constraint

**Pros**:
- Database enforces limit
- Catches all insertion paths

**Cons**:
- SQLite doesn't enforce VARCHAR(n)
- Requires CHECK constraint

**Effort**: Small
**Risk**: Low

```sql
-- In future migrations
ALTER TABLE trust_recovery_checkpoints
ADD CHECK (length(thread_id) <= 256);
```

# Recommended Action

**Option A** for immediate fix. Option B as follow-up for defense in depth.

# Technical Details

**Affected Files**:
- `src-tauri/src/recovery_checkpoint.rs`
- `src-tauri/src/approval_ledger.rs` (uses thread_id similarly)

# Acceptance Criteria

- [ ] Add `MAX_THREAD_ID_LENGTH` constant (suggest 256 bytes)
- [ ] Update `normalize_thread_id` to validate length
- [ ] Add unit test for length validation
- [ ] Document expected thread ID format

# Work Log

_2026-03-08_: Initial finding from security review

# Resources

- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
