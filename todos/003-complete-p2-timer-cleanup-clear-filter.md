---
status: complete
priority: p2
issue_id: FR-003
tags:
  - code-review
  - reliability
  - react
  - ux
dependencies: []
---

## Problem Statement
The delayed dashboard-clear animation callback in `handleClearFilter` uses a raw timeout without cancellation. If the `App` component unmounts or the user rapidly re-enters filter mode, the callback can execute stale updates.

## Findings
- `handleClearFilter` in `src/App.tsx` sets `setIsExitingFilteredView(true)` and schedules a `setTimeout(..., 180)` to reset filter and restore focus.
- There is no timer ref or cleanup hook to cancel this timeout.
- This is a shared top-level callback and can run after state transitions, causing hard-to-reproduce focus/animation ordering bugs.

### Evidence
- `src/App.tsx:333-347`

## Proposed Solutions
### Option 1: Add cancellable timer ref (Recommended)
- **Effort:** Small
- **Risk:** Low
- **Pros:** Directly fixes stale callback risk with minimal churn.
- **Approach:**
  - Add `const clearFilterTimerRef = useRef<number | null>(null)`.
  - Clear prior timer before scheduling a new one.
  - Clear timer in `useEffect` cleanup when component unmounts.

### Option 2: Use Transition API for async exit flow
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** Better synchronization with React state transitions.
- **Approach:**
  - Replace ad hoc delay with CSS-based animation state and transition end listener.

### Option 3: Move filter-clear logic into Branch/Dashboard view lifecycle
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** Centralizes navigation timing with view-specific state.
- **Approach:**
  - Trigger callback when the view confirms exit animation end.

## Recommended Action

## Technical Details
- Affected file: `src/App.tsx`
- Affected behavior: Dashboard drill-down/clear filter exit transition and focus restoration.

## Acceptance Criteria
- [ ] Timeout is stored and canceled on component cleanup.
- [ ] `setDashboardFilter(null)` cannot run after unmount from this flow.
- [ ] Keyboard and focus behavior remains unchanged when filter clear succeeds quickly.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Documented uncancelled timeout risk in app-level exit callback.

## Resources
- Reviewed file: `src/App.tsx`
