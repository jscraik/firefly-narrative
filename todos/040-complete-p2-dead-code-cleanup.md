---
status: pending
priority: p2
issue_id: 040
tags:
  - code-review
  - simplification
  - code-quality
dependencies: []
---

# Problem Statement

Multiple dead code constants and unused variants exist in `codex_app_server.rs` and `approval_ledger.rs`, creating confusion about intended functionality.

## Impact

- **Severity**: P2 (Important - Should Fix)
- **Type**: Code Quality / Maintainability
- **Risk**: Confusion, misleading code readers

# Findings

**Location 1**: `src-tauri/src/codex_app_server.rs:35-45`

```rust
#[allow(dead_code)]
const RECONNECT_REASON_*: &str = ...;  // Multiple constants

#[allow(dead_code)]
const APP_SERVER_SCHEMA_SUPPORTED: &str = ...;

#[allow(dead_code)]
const REQUIRED_APP_SERVER_METHODS: &[&str] = &["*"];
```

**Location 2**: `src-tauri/src/codex_app_server.rs:153-159`

```rust
enum SchemaVersionPolicy {
    // Never used
}
```

**Location 3**: `src-tauri/src/approval_ledger.rs:53-74`

```rust
pub enum ApprovalLedgerError {
    // PermissionDenied - never constructed
    // CorruptionError - never constructed
}
```

# Proposed Solutions

## Option A: Remove dead code (Recommended)

**Pros**:
- Cleaner codebase
- No confusion about intended behavior

**Cons**:
- May break if code was intended for future use

**Effort**: Small
**Risk**: Low

## Option B: Document future use and suppress warnings

**Pros**:
- Preserves potential future code
- Explicit intent

**Cons**:
- Still adds noise
- Warnings still present

**Effort**: Small
**Risk**: Low

```rust
/// Reserved for future schema version negotiation (see #123)
#[allow(dead_code)]
const APP_SERVER_SCHEMA_SUPPORTED: &str = "1.0.0";
```

# Recommended Action

**Option A** for immediate cleanup. If constants are needed later, they can be re-added with clear documentation of purpose.

# Technical Details

**Affected Files**:
- `src-tauri/src/codex_app_server.rs`
- `src-tauri/src/approval_ledger.rs`

# Acceptance Criteria

- [ ] Remove unused `RECONNECT_REASON_*` constants
- [ ] Remove or document `SchemaVersionPolicy` enum
- [ ] Remove unused error variants or add `#[allow(dead_code)]` with TODO comment
- [ ] Verify no compilation warnings after cleanup

# Work Log

_2026-03-08_: Initial finding from simplification review

# Resources

- [Rust Dead Code Lint](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html#dead-code)
