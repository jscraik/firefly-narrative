---
status: complete
priority: p3
issue_id: FR-008
tags:
  - code-review
  - accessibility
  - a11y
dependencies: []
---

## Problem Statement
Two newly introduced decorative SVGs lack accessible text/title semantics. This can degrade screen-reader context and violates project lint/accessibility checks.

## Findings
- Added docs-mode warning icon uses `<svg>` without `aria-label`/`title` inside `DocsView`.
- Newly wrapped timeline details disclosure icon also lacks accessible title/label.
- This pattern is currently flagged by lint (`noSvgWithoutTitle`) during review.

### Evidence
- `src/App.tsx:134`
- `src/ui/views/BranchView.tsx:793`

## Proposed Solutions
### Option 1: Add explicit `<title>` elements (Recommended)
- **Effort:** Small
- **Risk:** Low
- **Approach:**
  - Add `<title>Desktop app required</title>` and similar labels.
  - If used decoratively, set `aria-hidden="true"` and remove warnings accordingly.

### Option 2: Replace with icon components that support accessible labels
- **Effort:** Small
- **Risk:** Low
- **Approach:**
  - Use existing icon components with accessible props or `role="img" aria-label="..."`.

### Option 3: Centralize icon helper wrappers
- **Effort:** Medium
- **Risk:** Medium
- **Approach:**
  - Introduce typed SVG helper component with required `accessibilityLabel` prop.

## Recommended Action

## Technical Details
- Affected files: `src/App.tsx`, `src/ui/views/BranchView.tsx`

## Acceptance Criteria
- [ ] Lint warnings for `noSvgWithoutTitle` removed.
- [ ] Screen readers have meaningful labels or icons are properly hidden.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Found and documented new accessibility regressions introduced by inline SVG additions.

## Resources
- `src/App.tsx`
- `src/ui/views/BranchView.tsx`
