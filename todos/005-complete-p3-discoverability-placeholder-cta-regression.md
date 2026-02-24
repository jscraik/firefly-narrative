---
status: complete
priority: p3
issue_id: FR-005
tags:
  - code-review
  - product
  - ui
dependencies: []
---

## Problem Statement
The empty-state card for non-repo contexts now renders only an "Open a repository" button when callback is present, removing prior secondary actions that guided users toward docs/session workflows.

## Findings
- `RepositoryPlaceholderCard` previously rendered three action tiles (including explore and link sessions options).
- New implementation replaces that grid with a single conditional CTA (`onOpenRepo`) and removes secondary affordances.
- This is a product behavior regression in discoverability for users who previously navigated from this placeholder without opening the top-level menu first.

### Evidence
- `src/ui/components/RepositoryPlaceholderCard.tsx:82-109`

## Proposed Solutions
### Option 1: Preserve multi-action placeholder when beneficial (Recommended)
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Restores discovery without reducing visual refresh.
- **Approach:**
  - Reintroduce Explore History and Link Sessions cards conditionally.
  - Keep new visual theme while preserving actions.

### Option 2: Add contextual helper text and discoverability links
- **Effort:** Small
- **Risk:** Low
- **Pros:** Keeps simpler UI while still surfacing flows.
- **Approach:**
  - Add inline quick links to import/session actions when repository is unavailable.

### Option 3: Add onboarding tooltip sequence
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** No card layout bloat.
- **Approach:**
  - Show lightweight feature tour with direct CTA targets.

## Recommended Action

## Technical Details
- Affected file: `src/ui/components/RepositoryPlaceholderCard.tsx`
- Affected surfaces: repo/dashboard/docs placeholders.

## Acceptance Criteria
- [x] Users can reach equivalent secondary workflows from the empty state.
- [x] No loss of function from prior placeholder version.
- [x] Visual styling remains consistent with new animated brand language.

## Work Log
- 2026-02-24: Reintroduced quick-action tiles (contextual per variant) while preserving refreshed visual style and optional primary CTA.
- 2026-02-23: Identified UX discoverability regression in placeholder action layout.

## Resources
- Reviewed files: `src/ui/components/RepositoryPlaceholderCard.tsx`
