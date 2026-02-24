---
status: complete
priority: p3
issue_id: FR-006
tags:
  - code-review
  - architecture
  - maintainability
dependencies: []
---

## Problem Statement
Navigation mode contracts changed (`landing` removed from `TopNav.Mode`) without a full cleanup pass through related consumers and hooks, increasing risk of silent mismatches and dead paths.

## Findings
- `TopNav.Mode` changed to `demo | repo | docs | dashboard` and UI tab order now excludes `landing`.
- `src/hooks/useCommitData.ts` still declares mode union including `landing`, and related request identity/type helpers still carry `landing` paths.
- `FireflyLanding` was moved to a separate app folder, but type boundaries have not been fully unified.
- This creates maintenance drift and can hide future integration mistakes around unsupported modes.

### Evidence
- `src/ui/components/TopNav.tsx:6-7`, `src/ui/components/TopNav.tsx:53`
- `src/hooks/useCommitData.ts:26`
- `src/ui/components/branchHeaderMapper.ts:7`

## Proposed Solutions
### Option 1: Consolidate mode enum in a shared type (Recommended)
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Prevents drift and enforces compile-time consistency.
- **Approach:**
  - Introduce a shared `Mode` type in a common types module used by all hooks/components.
  - Remove stale landing variants where in-app mode no longer supports it.

### Option 2: Remove landing from hook/domain types with explicit TODO migration notes
- **Effort:** Small
- **Risk:** Low
- **Pros:** Fast cleanup of dead values.
- **Approach:**
  - Narrow `useCommitData` and related helpers to active modes only.
  - Update tests/docs/comments accordingly.

### Option 3: Keep landing as a legacy reserved mode with guards
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** Safer if future launch path reintroduces landing.
- **Approach:**
  - Add explicit `if (mode === "landing")` guards and logging to prevent silent dead code.

## Recommended Action

## Technical Details
- Affected files: `src/ui/components/TopNav.tsx`, `src/hooks/useCommitData.ts`, `src/ui/components/branchHeaderMapper.ts`.

## Acceptance Criteria
- [ ] Single shared mode definition used across navigation, data, and header derivation.
- [ ] No stale mode variants remain in active execution paths.
- [ ] CI catches mode mismatches via type checks/tests.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Captured consistency gap introduced during landing-page separation refactor.

## Resources
- Reviewed files: `src/ui/components/TopNav.tsx`, `src/hooks/useCommitData.ts`, `src/ui/components/branchHeaderMapper.ts`
