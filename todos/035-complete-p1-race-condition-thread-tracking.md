---
status: complete
priority: p1
issue_id: 035
tags:
  - code-review
  - architecture
  - race-condition
  - trust-state
dependencies: []
---

# Problem Statement

A race condition exists in `useAutoIngest.ts` where rapid thread ID changes can trigger multiple concurrent checkpoint load operations, potentially leading to stale state or UI thrashing.

## Impact

- **Severity**: P1 (Critical - Blocks Merge)
- **Type**: Race Condition / State Corruption
- **Symptom**: UI shows incorrect trust state after rapid thread switches

# Findings

**Location**: `src/hooks/useAutoIngest.ts:354-361`

```typescript
if (
  (event.payload.type === 'SessionDelta' || event.payload.type === 'ApprovalRequest') &&
  event.payload.threadId
) {
  setActiveThreadId(event.payload.threadId);
}
```

Combined with the `useEffect` at lines 189-193, this triggers checkpoint loads on every thread ID change.

**Root Cause**:
1. Thread ID updates on every live event
2. `useEffect` immediately fires `loadRecoveryCheckpoint`
3. No cancellation of previous in-flight requests
4. No debouncing to allow stabilization

**Scenario**:
1. Event A with threadId "thread-1" arrives, triggers load
2. Event B with threadId "thread-2" arrives 50ms later, triggers second load
3. Both loads race, last to complete wins regardless of order

# Proposed Solutions

## Option A: Add debouncing with useDeferredValue (Recommended)

**Pros**:
- React idiomatic pattern
- Minimal code change
- Handles rapid updates gracefully

**Cons**:
- Slight delay in thread switching

**Effort**: Small
**Risk**: Low

```typescript
const deferredActiveThreadId = useDeferredValue(activeThreadId);

useEffect(() => {
  if (deferredActiveThreadId) {
    loadRecoveryCheckpoint(deferredActiveThreadId);
  }
}, [deferredActiveThreadId, loadRecoveryCheckpoint]);
```

## Option B: Add AbortController for request cancellation

**Pros**:
- Proper cancellation of stale requests
- No artificial delays

**Cons**:
- More complex state management
- Requires Tauri invoke cancellation support

**Effort**: Medium
**Risk**: Medium

```typescript
useEffect(() => {
  const controller = new AbortController();

  if (activeThreadId) {
    loadRecoveryCheckpoint(activeThreadId, controller.signal);
  }

  return () => controller.abort();
}, [activeThreadId, loadRecoveryCheckpoint]);
```

## Option C: Track request IDs and ignore stale responses

**Pros**:
- Simple pattern
- Works without abort support

**Cons**:
- Still makes unnecessary network calls
- More state to track

**Effort**: Small
**Risk**: Low

```typescript
const requestIdRef = useRef(0);

useEffect(() => {
  const currentRequestId = ++requestIdRef.current;

  if (activeThreadId) {
    invoke('...').then((result) => {
      if (requestIdRef.current === currentRequestId) {
        setTrustState(result);
      }
    });
  }
}, [activeThreadId]);
```

# Recommended Action

**Option A** (debouncing) for immediate fix. Consider Option B as follow-up improvement.

# Technical Details

**Affected Files**:
- `src/hooks/useAutoIngest.ts`

**Related Code**:
- `useEffect` at lines 189-193
- Thread tracking at lines 354-361
- `loadRecoveryCheckpoint` callback at lines 172-186

# Acceptance Criteria

- [ ] Thread ID changes are debounced or stabilized
- [ ] Only one checkpoint load is in-flight per thread at a time
- [ ] Stale responses don't update UI state
- [ ] Test case added for rapid thread switching scenario

# Work Log

_2026-03-08_: Initial finding from architecture review

# Resources

- [React useDeferredValue Docs](https://react.dev/reference/react/useDeferredValue)
- [React useEffect Cleanup](https://react.dev/learn/synchronizing-with-effects#step-3-add-cleanup-if-needed)
