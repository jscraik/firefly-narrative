---
status: complete
priority: p2
issue_id: 041
tags:
  - code-review
  - architecture
  - state-management
dependencies: []
---

# Problem Statement

Two separate state sources (`captureReliability.mode` and `trustState`) can become inconsistent, leading to "split brain" scenarios where different parts of the code have different views of system health.

## Impact

- **Severity**: P2 (Important - Should Fix)
- **Type**: Architecture / State Management
- **Risk**: Inconsistent UI, incorrect decisions

# Findings

**Location**: `src/hooks/useAutoIngest.ts`

Multiple separate state variables:
```typescript
const [captureReliability, setCaptureReliability] = useState<...>(null);
const [codexAppServerStatus, setCodexAppServerStatus] = useState<...>(null);
const [trustState, setTrustState] = useState<...>('none');
```

**Issue**:
- `captureReliability.mode` can be `'HYBRID_ACTIVE'`
- `trustState` can be `'trust_paused'`
- Which is authoritative for "is capture healthy?"
- Updates happen at different times, potentially causing inconsistency

# Proposed Solutions

## Option A: Use reducer pattern for atomic updates (Recommended)

**Pros**:
- Single source of truth
- Atomic updates
- Impossible invalid intermediate states

**Cons**:
- Refactor required
- More boilerplate

**Effort**: Medium
**Risk**: Low

```typescript
type TrustSystemState = {
  captureMode: CaptureMode;
  trustState: TrustState;
  appServerState: ProcessState;
  blockingReasons: string[];
};

type TrustSystemAction =
  | { type: 'CAPTURE_MODE_CHANGED'; mode: CaptureMode }
  | { type: 'TRUST_STATE_CHANGED'; state: TrustState }
  | { type: 'SERVER_STATUS_CHANGED'; status: CodexAppServerStatus };

function trustSystemReducer(
  state: TrustSystemState,
  action: TrustSystemAction
): TrustSystemState {
  // Single atomic update
}
```

## Option B: Derive trust state from capture reliability

**Pros**:
- Single source of truth
- No split brain possible

**Cons**:
- May lose granularity
- Doesn't address all state

**Effort**: Small
**Risk**: Low

```typescript
const derivedTrustState = useMemo(() => {
  if (!captureReliability) return 'none';
  if (captureReliability.mode === 'HYBRID_DRAINED') return 'trust_paused';
  // ... etc
}, [captureReliability, codexAppServerStatus]);
```

## Option C: Add invariant checks in development

**Pros**:
- Catches bugs early
- Documents expected relationships

**Cons**:
- Doesn't prevent issues
- Only in dev mode

**Effort**: Small
**Risk**: Low

```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    if (captureReliability?.mode === 'HYBRID_ACTIVE' && trustState === 'trust_paused') {
      console.warn('Invariant violation: capture active but trust paused');
    }
  }
}, [captureReliability, trustState]);
```

# Recommended Action

**Option B** for immediate fix. **Option A** as medium-term refactor.

# Technical Details

**Affected Files**:
- `src/hooks/useAutoIngest.ts`
- `src/ui/components/TrustStateIndicator.tsx`

# Acceptance Criteria

- [ ] Document which state is authoritative for each decision
- [ ] Add invariant checks in development mode
- [ ] Consider reducer pattern for future refactor
- [ ] Add tests for state consistency

# Work Log

_2026-03-08_: Initial finding from architecture review

# Resources

- [React useReducer Docs](https://react.dev/reference/react/useReducer)
- [State Machine Patterns in React](https://kentcdodds.com/blog/implementing-a-simple-state-machine-library-in-javascript)
