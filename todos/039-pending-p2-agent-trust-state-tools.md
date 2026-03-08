---
status: pending
priority: p2
issue_id: 039
tags:
  - code-review
  - agent-native
  - accessibility
  - tauri
dependencies: []
---

# Problem Statement

UI buttons "Retry Hydrate" and "Clear Stale State" have no equivalent Tauri IPC commands, preventing agents from triggering these recovery actions.

## Impact

- **Severity**: P2 (Important - Should Fix)
- **Type**: Agent-Native Accessibility
- **Risk**: Agents cannot recover from trust_paused state

# Findings

**Location**: `src/ui/components/TrustStateIndicator.tsx:185-201`

```tsx
{canRetry && (
  <button
    type="button"
    onClick={onRetryHydrate}
    // ...
  >
    Retry Hydrate
  </button>
)}
{canClearStale && (
  <button
    type="button"
    onClick={onClearStaleState}
    // ...
  >
    Clear Stale State
  </button>
)}
```

**Missing Tauri Commands**:
- `codex_app_server_retry_hydrate` - triggers retry of checkpoint hydration
- `codex_app_server_clear_stale_state` - clears stale trust state

**Impact**:
- Agent can see trust_paused state via status commands
- Agent cannot take recovery action
- User must manually click buttons

# Proposed Solutions

## Option A: Expose new Tauri IPC commands (Recommended)

**Pros**:
- Full agent parity with UI
- Clean command interface
- Type-safe via TypeScript bindings

**Cons**:
- Requires Rust implementation
- More code surface

**Effort**: Medium
**Risk**: Low

```rust
// In codex_app_server.rs
#[tauri::command]
pub async fn codex_app_server_retry_hydrate(
    thread_id: String,
    state: State<'_, CodexAppServerRuntime>,
) -> Result<(), String> {
    // Implementation
}

#[tauri::command]
pub async fn codex_app_server_clear_stale_state(
    thread_id: String,
    state: State<'_, CodexAppServerRuntime>,
) -> Result<(), String> {
    // Implementation
}
```

## Option B: Document existing workarounds

**Pros**:
- No code change
- Fast resolution

**Cons**:
- Agents still limited
- Poor experience

**Effort**: Small
**Risk**: Medium (accepts limitation)

# Recommended Action

**Option A** - implement new commands. These are critical recovery actions that agents should be able to trigger.

# Technical Details

**Affected Files**:
- `src-tauri/src/codex_app_server.rs` (new commands)
- `src-tauri/src/lib.rs` (command registration)
- `src/hooks/useAutoIngest.ts` (invoke wrappers)

# Acceptance Criteria

- [ ] Add `codex_app_server_retry_hydrate` Tauri command
- [ ] Add `codex_app_server_clear_stale_state` Tauri command
- [ ] Register commands in lib.rs
- [ ] Add TypeScript wrapper functions
- [ ] Document in agent context/system prompt
- [ ] Add tests for command invocation

# Work Log

_2026-03-08_: Initial finding from agent-native review

# Resources

- [Tauri Commands Documentation](https://tauri.app/v1/guides/features/command/)
