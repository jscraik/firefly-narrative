# Shell Audit 2026-03-11

## Table of Contents

- [Summary](#summary)
- [Delivered Contract](#delivered-contract)
- [Remaining Follow-Through](#remaining-follow-through)

## Summary

The shell now matches the intended information architecture more closely than the earlier route-first taxonomy. The visible product posture is a flat six-lane navigation model:

- `Narrative Brief`
- `Repo Evidence`
- `Sessions`
- `Tools`
- `Hygiene`
- `Settings`

The earlier hidden-route ownership layer has been removed from primary shell behavior. Docs access now lives inside Settings instead of surviving as a dedicated top-level route.

## Delivered Contract

### /Users/jamiecraik/dev/trace-narrative/src/core/types.ts

Delivered:

- `Mode` is reduced to six canonical lanes
- `AnchorMode` is reduced to `dashboard | repo`
- `SurfaceMode` is reduced to `sessions | tools | hygiene | settings`
- `ViewSection` remains metadata only

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/Sidebar.tsx

Delivered:

- primary navigation is a flat six-item list
- active state is direct, not legacy-owner mapped
- sidebar section headers are no longer part of the visible shell

### /Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx

Delivered:

- top-nav framing only understands the canonical six modes
- direct legacy-route remapping logic is removed
- quick-jump routes stay focused on core evidence return paths

### /Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx

Delivered:

- standalone `docs` anchor routing is removed
- `settings` now flows through the shared surface contract

### /Users/jamiecraik/dev/trace-narrative/src/ui/views/SettingsView.tsx

Delivered:

- settings owns repository docs access directly
- docs are embedded through `DocsOverviewPanel` instead of a separate shell destination

### /Users/jamiecraik/dev/trace-narrative/src/ui/views/narrativeSurfaceData.ts

Delivered:

- active shared-surface contract is centered on `sessions`, `tools`, `hygiene`, and `settings`
- hygiene actions no longer route to deleted shell modes
- repo and hygiene remain the two main evidence-return lanes from shared surfaces

## Remaining Follow-Through

1. Delete the dormant legacy view files once the team no longer needs them for historical reference or incremental extraction work.
2. Continue tightening view-specific copy so older labels such as `Trust Center` and `Live capture` read more like subpanels than retired routes.
3. Keep future shell additions constrained to the six-lane model unless a new spec explicitly expands the top-level IA.
