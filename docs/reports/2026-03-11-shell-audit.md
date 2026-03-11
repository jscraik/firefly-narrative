# Shell Audit 2026-03-11

## Table of Contents

- [Summary](#summary)
- [File Audit](#file-audit)
- [Priority Order](#priority-order)

## Summary

The current shell has solid structure, but its labels and dashboard framing drift toward a generic reference dashboard. The immediate correction is to preserve layout while changing taxonomy, copy, and first-impression screens to emphasize narrative evidence.

## File Audit

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/Sidebar.tsx

Change first:

- rename section headers from `Overview/Monitor/Ecosystem/Config` to `Narrative/Evidence/Integrations/Configure`
- rename primary entries to `Narrative Brief`, `Story Map`, `Codex Copilot`, `Live Capture`, `Causal Timeline`, `Repo Evidence`, and `Hygiene`
- keep the physical layout unchanged

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx

Change first:

- keep the three-tab anchor model
- rename `Cockpit` to `Narrative`
- replace duplicate product branding with lightweight surface context copy

### /Users/jamiecraik/dev/trace-narrative/src/ui/views/DashboardView.tsx

Change first:

- replace the generic greeting with a narrative brief
- add a real evidence summary using repo stats
- point the user toward repo evidence, Codex session import, and hygiene review

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/dashboard/MetricsGrid.tsx

Change first:

- remove fake `Linked Sessions` and `System Health`
- use real metrics only
- replace reference-app comments with Trace-specific language

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/dashboard/QuickActions.tsx

Change first:

- remove generic AI-dashboard actions
- use `Open Repo Evidence`, `Import Codex Session`, and `Review Hygiene`

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/dashboard/RecentActivity.tsx

Change first:

- rename to `Evidence Trail`
- make the CTA open repo trail rather than generic activity

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/dashboard/TopFilesTable.tsx

Change first:

- reposition as evidence-ranked files rather than generic AI leaderboard

### /Users/jamiecraik/dev/trace-narrative/src/ui/views/DocsView.tsx

Change first:

- remove stale `Firefly Narrative` copy
- keep docs aligned with Trace Narrative naming

### /Users/jamiecraik/dev/trace-narrative/src/ui/views/cockpitViewData.ts

Change first:

- align section labels with the new IA
- make assistant copy explicitly Codex-first
- update settings copy to avoid provider sprawl
- keep Hygiene and Settings behaviorally intact

### /Users/jamiecraik/dev/trace-narrative/src/core/types.ts

Change first:

- update `ViewSection` to the new taxonomy so UI and tests share one contract

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/__tests__/Sidebar.test.tsx
### /Users/jamiecraik/dev/trace-narrative/src/ui/components/__tests__/TopNav.test.tsx

Change first:

- update expected labels and section headers to match the shell redesign
- preserve the anchor-mode navigation contract

## Priority Order

1. Shell taxonomy and dashboard framing
2. Codex-first copy in assistant/settings/dashboard empty states
3. Test updates for the new contract
4. Deeper provider-expansion and signature visualization work
