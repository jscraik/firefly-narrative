---
status: complete
priority: p2
issue_id: FR-002
tags:
  - code-review
  - reliability
  - keyboard
  - accessibility
  - react
dependencies: []
---

## Problem Statement
`Timeline` clears the keyboard pulse indicator with `setTimeout`, but timeout handles are not persisted and not cancelled on unmount. This can trigger delayed state updates after unmount and create noisy state churn during rapid navigation.

## Findings
- In `Timeline` keydown handler, both ArrowLeft and ArrowRight branches call `setTimeout(() => setKeyboardPulseId(null), 300)`.
- The callbacks are not canceled if the timeline unmounts before 300ms.
- The component already animates each key interaction; this adds extra asynchronous work with no cancellation path.

### Evidence
- `src/ui/components/Timeline.tsx:156-174`

## Proposed Solutions
### Option 1: Track a single pulse timer ref (Recommended)
- **Effort:** Small
- **Risk:** Low
- **Pros:** Localized fix, minimal behavioral impact.
- **Approach:**
  - Add `const keyboardPulseTimerRef = useRef<number | null>(null)`.
  - Clear previous timeout before scheduling a new pulse clear.
  - Clear timer in effect cleanup for component teardown.

### Option 2: Use `setKeyboardPulseId` with `AbortController` or `requestAnimationFrame` fallback
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Cleaner cancel semantics if reused for other UI pulses.
- **Approach:**
  - Replace timeout with helper that returns clear function; ensure unmount-safe.

### Option 3: Avoid timeout by animation end event
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** Precise timing tied to UI.
- **Approach:**
  - Attach pulse class for a fixed CSS duration and clear via animation end event.

## Recommended Action

## Technical Details
- Affected file: `src/ui/components/Timeline.tsx`
- Affected behavior: Keyboard timeline pulse highlight in both directions.

## Acceptance Criteria
- [ ] Timeout is cleared when `Timeline` unmounts.
- [ ] Repeated arrow-key bursts reset cleanly without residual timers.
- [ ] No delayed state updates observed after unmount in manual/automation navigation.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Identified missing timeout cleanup in keyboard interaction path.

## Resources
- Reviewed file: `src/ui/components/Timeline.tsx`
- Context: `src/ui/views/BranchView.tsx` (where timeline is mounted/updated)
