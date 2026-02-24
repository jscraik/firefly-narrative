---
status: complete
priority: p2
issue_id: FR-001
tags:
  - code-review
  - reliability
  - react
  - performance
dependencies: []
---

## Problem Statement
A burst animation timer can continue after the component using `useFirefly` unmounts. The hook schedules a timeout to clear transient burst state but never tracks/cancels it, which can cause work on unmounted components and stale state updates.

## Findings
- `triggerBurst` in `src/hooks/useFirefly.ts` sets `burstType` then schedules `setTimeout(() => setBurstType(null), 1000)`.
- There is no cleanup path storing the timer ID (`setTimeout` line 162) and no `clearTimeout` on hook cleanup.
- This pattern can emit React "state update on an unmounted component" in rapid mode switches and is inconsistent with existing timer handling patterns in the codebase (`dwellTimerRef`, `orbBurstTimerRef` in landing hero).

### Evidence
- `src/hooks/useFirefly.ts:160-163`

## Proposed Solutions
### Option 1 (Recommended): Store timer in a ref and clear on unmount
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Minimal code changes; deterministic cleanup.
- **Approach:**
  - Add `const burstTimerRef = useRef<number | null>(null)`.
  - In `triggerBurst`, clear prior timer and assign new timeout ID.
  - Return cleanup `clearTimeout` in effect cleanup.

### Option 2: Replace with `useTimeout`/custom scheduler utility
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Reusable cancellation semantics.
- **Approach:**
  - Introduce a small timer utility or hook for one-shot UI bursts.
  - Reuse for other transient states (`pulseCommitId`, `keyboardPulseId` cleanup).

### Option 3: Remove burst fallback entirely when unmounted
- **Effort:** Small
- **Risk:** Medium
- **Pros:** Eliminates timer usage in this path.
- **Approach:**
  - Drive burst state through `setInterval`/animationend events or debounced event bus with `AbortController`.

## Recommended Action

## Technical Details
- Affected files: `src/hooks/useFirefly.ts`
- Functional area: Firefly burst feedback lifecycle.
- Impacted behavior: Brief success/error burst animation may attempt teardown after component unmount.

## Acceptance Criteria
- [ ] Burst timer ID is tracked and always cleared on unmount.
- [ ] Repeated burst invocations do not accumulate uncancelled timers.
- [ ] `pnpm lint` no longer reports `noExplicitAny` or timer-related warnings from this path.
- [ ] No unmounted state updates in quick open/close flows.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Identified missing cleanup in `triggerBurst`; no code changes committed yet.

## Resources
- Reviewed files: `src/hooks/useFirefly.ts`
- Related docs: `docs/agents/01-instruction-map.md`
