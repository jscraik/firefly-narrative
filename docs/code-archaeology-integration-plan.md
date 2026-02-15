# Narrative Integration Plan — Code Archaeology Kit

## Goal
Expose `code-archaeology-kit` scans inside Narrative so Jamie can run scans, review findings, and action top leverage items without leaving the app.

## Integration model
1. Narrative invokes local CLI:
   - `cak scan --repo <path> --format both --output-dir <tmp>`
2. Narrative ingests:
   - `archaeology.json`
   - `archaeology_report.md`
3. Narrative renders:
   - Top actions
   - Coupling classes
   - Abandoned hotspots

## Proposed UI surfaces
- Dashboard card: **Code Archaeology** (latest run + status)
- Repo detail tab: **Archaeology**
  - Top 3 actions
  - Coupling table (expected/risky/suspicious)
  - Path-class filters

## Implementation tasks
- Add `src/core/repo/archaeology.ts` repository service:
  - run CLI
  - parse JSON output
  - normalize schema
- Add `src/core/repo/__tests__/archaeology.test.ts`
- Add `src/ui/views/ArchaeologyView.tsx`
- Wire navigation from `DashboardView` and repo detail route

## Acceptance criteria
- One-click run from Narrative repo view
- JSON parse/validation errors surfaced cleanly
- Top actions displayed with rationale/effort/leverage
- Runs are persisted and re-openable
