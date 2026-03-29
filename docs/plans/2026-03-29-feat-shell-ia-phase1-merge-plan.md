---
title: Shell IA Phase 1 Merge Plan
type: feat
status: completed
date: 2026-03-29
origin: docs/specs/2026-03-10-feat-updated-ui-views-spec.md
deepened: 2026-03-29
---

## Table of Contents

- [Overview](#overview)
- [Enhancement Summary](#enhancement-summary)
- [Decision Summary](#decision-summary)
- [Scope and Non-Goals](#scope-and-non-goals)
- [Execution Posture](#execution-posture)
- [Dependency and Coupling Notes](#dependency-and-coupling-notes)
- [Implementation Phases](#implementation-phases)
- [Acceptance Checklist](#acceptance-checklist)
- [Validation Strategy](#validation-strategy)
- [Phase 2 Entry Gate](#phase-2-entry-gate)
- [Risks and Rollback](#risks-and-rollback)
- [Next Step](#next-step)
- [Sources and References](#sources-and-references)

## Overview

This plan narrows the Trace Narrative shell to six visible lanes without deleting the broader internal routing model on the first pass. The goal is to make the information architecture feel coherent immediately while avoiding a risky one-shot collapse of `Mode`, anchor routing, metadata mappings, and the existing surface test matrix.

The current repo is in a mixed state:

- [src/core/types.ts](/Users/jamiecraik/dev/trace-narrative/src/core/types.ts) does not include `hygiene` in `Mode`.
- [src/ui/components/Sidebar.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/Sidebar.tsx) still exposes the broad shell directly.
- [src/ui/components/TopNav.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx) still frames every active route as a first-class top-nav surface.
- [docs/agents/mode-registry.md](/Users/jamiecraik/dev/trace-narrative/docs/agents/mode-registry.md) already assumes `hygiene` exists and reflects a narrower shell posture than the runtime.
- [docs/specs/2026-03-10-feat-updated-ui-views-spec.md](/Users/jamiecraik/dev/trace-narrative/docs/specs/2026-03-10-feat-updated-ui-views-spec.md) still describes the broader mode contract.

This plan resolves that drift in two phases:

1. Phase 1 merges the visible IA while keeping legacy internal routes alive.
2. Phase 2 removes the now-stale route and type surface only after the merged shell feels correct.

## Enhancement Summary

**Deepened on:** 2026-03-29
**Key areas improved:** execution posture, cross-file coupling, per-phase validation gates, and cleanup start criteria

- Added an explicit execution posture so the implementation stays characterization-first for legacy-route preservation and test-first for the new six-lane shell contract.
- Added cross-file coupling notes for `Mode`, `AnchorMode`, `SurfaceMode`, `ALL_SURFACE_MODES`, and the docs-owned `docs` route so sequencing failures are easier to avoid.
- Added per-phase validation focus so sidebar/top-nav, shared-surface, and CTA regressions are checked at the point they are introduced rather than only at the end.
- Added a hard Phase 2 entry gate so route deletion and union shrinkage cannot start until the merged Phase 1 shell is stable and documented.
- Made the Phase 1 sidebar contract explicit: the visible shell becomes a flat six-item list while `ViewSection` remains internal metadata during the transition.
- Expanded the validation gate so Phase 1 work is expected to pass repo lint plus the markdown checks that cover `docs/plans`, `docs/specs`, and `docs/reports`.

## Decision Summary

### Visible navigation contract for Phase 1

The only sidebar destinations exposed as primary navigation after this change are:

- `dashboard` -> `Narrative Brief`
- `repo` -> `Repo Evidence`
- `sessions` -> `Sessions`
- `tools` -> `Tools`
- `hygiene` -> `Hygiene`
- `settings` -> `Settings`

### Sidebar section contract for Phase 1

Phase 1 uses a flat primary sidebar list with those six items only. It does not retain visible section headers such as `Narrative`, `Evidence`, `Workspace`, `Integrations`, `Health`, or `Configure` in the sidebar itself.

To avoid widening Phase 1 into premature type cleanup, `ViewSection` remains unchanged in [src/core/types.ts](/Users/jamiecraik/dev/trace-narrative/src/core/types.ts), but its role narrows during the transition:

- it continues to support top-nav framing and mode metadata
- it continues to describe parent-lane ownership for hidden legacy routes
- it is no longer treated as the authoritative visible sidebar-grouping contract in Phase 1

### Hidden but still routable legacy modes for Phase 1

The following routes remain valid and testable, but are no longer first-class sidebar destinations:

- `docs`
- `live`
- `transcripts`
- `costs`
- `setup`
- `work-graph`
- `repo-pulse`
- `timeline`
- `diffs`
- `worktrees`
- `env`
- `status`

### Ownership map for Phase 1

- `dashboard` owns the narrative brief entry experience.
- `repo` owns `repo-pulse`, `timeline`, `diffs`, `work-graph`, and `worktrees`.
- `sessions` owns `transcripts`.
- `tools` owns `costs`.
- `hygiene` owns `status`, `env`, `setup`, and `live`.
- `settings` owns `docs`.

### Phase 1 routing rules

- Add `hygiene` to `Mode`, but do not remove any existing `Mode` member yet.
- Keep `AnchorMode = "dashboard" | "repo" | "docs"` for now.
- Keep `SurfaceMode = Exclude<Mode, AnchorMode>` for now.
- Flatten the sidebar to a single six-item primary list and remove visible section headers there.
- Keep legacy routes deep-linkable and renderable.
- Do not delete legacy label metadata in Phase 1.
- Do not shrink `Mode`, `AnchorMode`, or `SurfaceMode` until the merged IA is validated in use.

## Scope and Non-Goals

### In scope

- Lock the six-lane visible shell contract in code, docs, and tests.
- Add `hygiene` as a first-class mode.
- Hide legacy routes from primary nav while keeping them routable.
- Reframe top-nav metadata so legacy deep links inherit parent-lane framing.
- Add merged-lane content and CTA ownership in [src/ui/views/NarrativeSurfaceView.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/NarrativeSurfaceView.tsx) and [src/ui/views/narrativeSurfaceData.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/narrativeSurfaceData.ts).
- Update plan/spec/report/mode-registry docs so they stop contradicting the runtime.

### Non-goals

- Shrinking the full `Mode` union in the same change as the IA merge.
- Removing `docs` as a standalone route in Phase 1.
- Rewriting the anchor behavior of `dashboard`, `repo`, or `docs`.
- Replacing `NarrativeSurfaceView` with a new top-level hygiene-specific view unless the merged surface proves insufficient.
- Broadening the shell beyond the six-lane contract.

## Execution Posture

- **Deepening mode:** `targeted-confidence`
- **Research execution mode:** `direct`
- **Execution style:** characterization-first for preserving hidden legacy routes, then test-first for the new visible-lane contract
- **Implementation ownership:** one main implementation lane; no multi-agent split is required to execute this safely

### Execution rules

- Do not batch all test edits at the end; update the contract-owning tests in the same phase that changes the corresponding runtime surface.
- Treat P0 and P1 as a single blocking lane. If docs and runtime disagree after P1, stop before P2.
- Keep P2 scoped to re-homing surfaces and CTA ownership only. If that work starts to imply route deletion or type shrinkage, stop and move it to the deferred Phase 2 cleanup task.
- Prefer one PR for the Phase 1 merge. If the surface-content work becomes materially larger than the nav contract work, split after the six-lane contract and test matrix are already passing.

## Dependency and Coupling Notes

### Critical coupling points

- `Mode`, `AnchorMode`, and `SurfaceMode` in [src/core/types.ts](/Users/jamiecraik/dev/trace-narrative/src/core/types.ts) drive both runtime routing and the shared-surface test matrix.
- [src/AppContent.tsx](/Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx) is the enforcement point for the current anchor contract and must stay aligned with `AnchorMode`.
- [src/ui/components/Sidebar.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/Sidebar.tsx) and [src/ui/components/TopNav.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx) currently encode first-class route visibility in different ways; Phase 1 must update them together.
- [src/ui/views/narrativeSurfaceData.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/narrativeSurfaceData.ts) and [narrativeSurfaceData.test.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/narrativeSurfaceData.test.ts) together form the authoritative shared-surface registry.
- [docs/agents/mode-registry.md](/Users/jamiecraik/dev/trace-narrative/docs/agents/mode-registry.md) already assumes `hygiene`, which means doc drift exists before the runtime changes begin.

### Count-sensitive contract

- The current `Mode` union has 17 entries with 3 anchors, so the shared-surface matrix expects 14 `SurfaceMode` values today.
- Adding `hygiene` to `Mode` in Phase 1 increases the expected `SurfaceMode` count to 15 while `AnchorMode` remains unchanged.
- Any Phase 1 edit that changes the count to something other than 15 signals unintended route deletion or an accidental new anchor.

### Docs-owned route note

- `docs` remains an anchor in Phase 1, but its shell ownership moves under `settings`.
- That means:
  - runtime routing still needs the `docs` branch in [src/AppContent.tsx](/Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx)
  - sidebar visibility should remove `docs`
  - top-nav metadata should frame `docs` as settings-owned when directly navigated
  - tests must stop treating `docs` as a permanently visible primary destination

## Implementation Phases

### P0 — Contract lock, doc alignment, and test target reset

- **Goal:** make the planned shell contract explicit before runtime edits begin.
- **Files:**
  - [docs/specs/2026-03-10-feat-updated-ui-views-spec.md](/Users/jamiecraik/dev/trace-narrative/docs/specs/2026-03-10-feat-updated-ui-views-spec.md)
  - [docs/reports/2026-03-11-shell-audit.md](/Users/jamiecraik/dev/trace-narrative/docs/reports/2026-03-11-shell-audit.md)
  - [docs/agents/mode-registry.md](/Users/jamiecraik/dev/trace-narrative/docs/agents/mode-registry.md)
  - [docs/plans/2026-03-29-feat-shell-ia-phase1-merge-plan.md](/Users/jamiecraik/dev/trace-narrative/docs/plans/2026-03-29-feat-shell-ia-phase1-merge-plan.md)
- **Actions:**
  - Rewrite the spec’s canonical mode matrix to distinguish Phase 1 visible lanes from legacy-but-routable routes.
  - Update the shell audit so it no longer recommends the broader section taxonomy as the end state.
  - Update the mode registry to match the actual Phase 1 contract and explicitly mark Phase 2 cleanup as deferred.
  - Record the sidebar presentation decision explicitly: Phase 1 uses a flat six-item list, while `ViewSection` remains metadata-only for top-nav and legacy-route ownership.
  - Confirm actual test file paths before edits; the authoritative surface tests are:
    - [Sidebar.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/__tests__/Sidebar.test.tsx)
    - [TopNav.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/__tests__/TopNav.test.tsx)
    - [NarrativeSurfaceView.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/NarrativeSurfaceView.test.tsx)
    - [narrativeSurfaceData.test.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/narrativeSurfaceData.test.ts)
- **Validation focus:**
  - Read back the spec, audit, and mode registry together and confirm they all name the same six visible lanes.
  - Confirm the plan, spec, and audit all describe the same flat-sidebar rule and do not preserve old section headers as visible shell contract.
  - Confirm the plan explicitly states that the Phase 1 `SurfaceMode` expectation becomes `15`, not `14`.
- **Exit criteria:**
  - The plan, spec, and mode registry all describe the same Phase 1 contract.
  - The Phase 2 cleanup boundary is written down explicitly.
  - No implementation starts from stale test paths or outdated IA docs.

### P1 — Runtime contract merge without route deletion

- **Goal:** collapse the visible shell to six lanes while preserving all current route behavior.
- **Files:**
  - [src/core/types.ts](/Users/jamiecraik/dev/trace-narrative/src/core/types.ts)
  - [src/ui/components/Sidebar.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/Sidebar.tsx)
  - [src/ui/components/TopNav.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx)
  - [src/AppContent.tsx](/Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx)
- **Actions:**
  - Add `hygiene` to `Mode`.
  - Leave the rest of the current `Mode` union intact.
  - Keep `AnchorMode` unchanged in Phase 1.
  - Replace the sidebar’s broad first-class route list with a flat six-item list only.
  - Remove visible section headers from the sidebar and stop using `ViewSection` as the sidebar-rendering contract in Phase 1.
  - Remove legacy routes from visible sidebar items, but keep `onModeChange` support for direct navigation and CTA handoffs.
  - Rewrite top-nav metadata so legacy modes inherit the label and section of their owning parent lane:
    - `live`, `env`, `status`, `setup` -> `Hygiene`
    - `repo-pulse`, `timeline`, `diffs`, `work-graph`, `worktrees` -> `Repo Evidence`
    - `transcripts` -> `Sessions`
    - `costs` -> `Tools`
    - `docs` -> `Settings`
  - Keep `docs` routable, but remove it from primary nav.
  - Keep `hygiene` inside shared-surface routing in Phase 1 rather than adding a dedicated top-level branch.
- **Validation focus:**
  - Run sidebar and top-nav tests immediately after the nav contract changes.
  - Confirm sidebar tests now assert the absence of legacy section headers and only the presence of the six visible destinations.
  - Confirm no runtime path other than `dashboard`, `repo`, or `docs` bypasses the shared-surface branch in [src/AppContent.tsx](/Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx).
- **Exit criteria:**
  - The sidebar shows only six destinations.
  - Legacy deep links still render valid screens.
  - Top-nav framing stays coherent even when a legacy route is active directly.
  - No route deletion or type shrinkage occurs in this phase.

### P2 — Surface ownership merge and CTA remapping

- **Goal:** make the six visible lanes feel real by re-homing legacy surfaces under their new owners.
- **Files:**
  - [src/ui/views/NarrativeSurfaceView.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/NarrativeSurfaceView.tsx)
  - [src/ui/views/narrativeSurfaceData.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/narrativeSurfaceData.ts)
  - [src/ui/views/DashboardView.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/DashboardView.tsx)
  - [src/ui/views/BranchView.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/BranchView.tsx)
- **Actions:**
  - Add `hygiene` as a first-class shared surface with merged subpanels for `status`, `env`, `setup`, and `live`.
  - Restructure `repo` framing so `repo-pulse`, `timeline`, `diffs`, `work-graph`, and `worktrees` read as contextual subpanels rather than sibling primary destinations.
  - Ensure `sessions` and `tools` each expose their legacy child surface contextually.
  - Re-map CTA targets so shell actions route to the new owners:
    - dashboard CTAs favor `repo`
    - repo CTAs open `timeline`, `diffs`, `work-graph`, `repo-pulse`, or `worktrees`
    - sessions CTAs open `transcripts`
    - tools CTAs open `costs`
    - hygiene CTAs open `status`, `env`, `setup`, or `live`
    - settings CTAs open `docs`
- **Validation focus:**
  - Update [NarrativeSurfaceView.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/NarrativeSurfaceView.test.tsx) and [narrativeSurfaceData.test.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/narrativeSurfaceData.test.ts) together.
  - Treat CTA destination changes in dashboard and branch tests as contract changes, not incidental copy updates.
- **Exit criteria:**
  - Each visible lane has an internally coherent merged surface.
  - Child-route CTAs feel contextual rather than like fallback escape hatches.
  - `docs` remains reachable from settings-owned shell flows.

### P3 — Regression net, validation, and Phase 2 follow-on boundary

- **Goal:** prove the Phase 1 merge is safe and leave the cleanup phase intentionally deferred.
- **Files:**
  - [Sidebar.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/__tests__/Sidebar.test.tsx)
  - [TopNav.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/__tests__/TopNav.test.tsx)
  - [NarrativeSurfaceView.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/NarrativeSurfaceView.test.tsx)
  - [narrativeSurfaceData.test.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/narrativeSurfaceData.test.ts)
  - [DashboardView.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/DashboardView.test.tsx)
  - [BranchView.test.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/__tests__/BranchView.test.tsx)
- **Actions:**
  - Update the sidebar and top-nav tests to assert the six-lane visible contract.
  - Add `hygiene` to the authoritative shared-surface mode matrix in `narrativeSurfaceData.test.ts`.
  - Keep legacy modes in that matrix for Phase 1 and update the expected count from `14` to `15`.
  - Add targeted assertions for parent-lane metadata inheritance on legacy routes.
  - Update dashboard and branch CTA assertions only where user-facing destinations actually change.
  - Record the follow-on cleanup boundary explicitly:
    - shrink `Mode`
    - revisit `AnchorMode`
    - recompute `SurfaceMode`
    - delete stale label/icon mappings
    - remove legacy-only test coverage once the routes are truly gone
- **Validation focus:**
  - Run the targeted nav and shared-surface tests before broader suite expansion.
  - Run dashboard and branch tests only after CTA destinations are final.
- **Exit criteria:**
  - The six visible lanes are enforced by tests.
  - Legacy routes remain covered as routable-but-hidden surfaces.
  - The next cleanup phase is reduced to a bounded deletion task rather than a re-decision about IA.

## Acceptance Checklist

- [x] AC1: Phase 1 runtime nav exposes exactly `dashboard`, `repo`, `sessions`, `tools`, `hygiene`, and `settings` as the only primary sidebar destinations, rendered as a flat list without visible section headers. Traceability: shell contract in this plan and [docs/agents/mode-registry.md](/Users/jamiecraik/dev/trace-narrative/docs/agents/mode-registry.md).
- [x] AC2: `hygiene` is added to `Mode` and rendered through the shared-surface pathway without deleting any existing legacy mode in the same change. Traceability: [src/core/types.ts](/Users/jamiecraik/dev/trace-narrative/src/core/types.ts), [src/AppContent.tsx](/Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx).
- [x] AC3: Legacy routes remain directly navigable and inherit coherent parent-lane framing in top-nav metadata. Traceability: [src/ui/components/TopNav.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx).
- [x] AC4: Merged-lane ownership is reflected in shared-surface data and CTA routing for repo, sessions, tools, hygiene, and settings. Traceability: [src/ui/views/NarrativeSurfaceView.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/NarrativeSurfaceView.tsx), [src/ui/views/narrativeSurfaceData.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/narrativeSurfaceData.ts).
- [x] AC5: The plan/spec/report/mode-registry docs no longer describe a broader primary nav than the runtime. Traceability: [docs/specs/2026-03-10-feat-updated-ui-views-spec.md](/Users/jamiecraik/dev/trace-narrative/docs/specs/2026-03-10-feat-updated-ui-views-spec.md), [docs/reports/2026-03-11-shell-audit.md](/Users/jamiecraik/dev/trace-narrative/docs/reports/2026-03-11-shell-audit.md), [docs/agents/mode-registry.md](/Users/jamiecraik/dev/trace-narrative/docs/agents/mode-registry.md).
- [x] AC6: Tests enforce the six-lane visible contract, stop treating `ViewSection` headers as visible sidebar requirements, and keep hidden legacy routes covered during the transition. Traceability: sidebar, top-nav, narrative-surface, dashboard, and branch test files named in P3.
- [x] AC7: Phase 2 cleanup is intentionally deferred and documented as a separate bounded task so implementation does not silently widen scope. Traceability: this plan’s P3 follow-on boundary.

## Validation Strategy

Run the smallest relevant checks first, then widen only if the runtime behavior changed beyond the shell contract.

### Targeted checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- src/ui/components/__tests__/Sidebar.test.tsx src/ui/components/__tests__/TopNav.test.tsx src/ui/views/__tests__/NarrativeSurfaceView.test.tsx src/ui/views/__tests__/narrativeSurfaceData.test.ts`

### Expanded checks when CTA or runtime behavior changes

- `pnpm test -- src/ui/views/__tests__/DashboardView.test.tsx src/ui/views/__tests__/BranchView.test.tsx`
- `pnpm test`

### Full behavior-change gate

- `pnpm test:deep`

### Documentation gate

- `pnpm docs:lint`
- `pnpm dlx markdownlint-cli2 docs/plans/2026-03-29-feat-shell-ia-phase1-merge-plan.md docs/specs/2026-03-10-feat-updated-ui-views-spec.md docs/reports/2026-03-11-shell-audit.md docs/agents/mode-registry.md`
- Update this plan first, then ensure the linked spec, audit, and mode-registry docs are edited before implementation is considered complete.
- Read back the touched docs together and confirm they all describe the same six visible lanes, the same flat-sidebar rule, and the same Phase 2 cleanup boundary.

## Phase 2 Entry Gate

Do not start the deferred cleanup phase until all of the following are true:

- the six visible lanes are shipping and test-backed
- legacy routes still resolve cleanly when navigated directly
- no unresolved ambiguity remains about whether `docs` stays an anchor or moves fully inside settings
- the spec, audit, and mode registry all describe the same Phase 1 runtime
- the team has at least one pass of hands-on validation that the merged `repo`, `sessions`, `tools`, and `hygiene` lanes feel coherent enough to justify deletion work

If any of those are false, the correct next move is more Phase 1 hardening, not cleanup.

## Risks and Rollback

- **Risk:** Phase 1 accidentally deletes behavior by shrinking `Mode` or `SurfaceMode` too early.
  - **Mitigation:** treat any union shrinkage as Phase 2-only work.
- **Risk:** top-nav becomes misleading for deep-linked legacy routes.
  - **Mitigation:** use explicit parent-lane metadata inheritance and test it directly.
- **Risk:** merged lanes become thin wrappers with no meaningful content ownership.
  - **Mitigation:** re-home legacy child surfaces into subpanels and CTA paths in P2, not just relabel the sidebar.
- **Risk:** docs remain contradictory even if the shell runtime changes.
  - **Mitigation:** make doc alignment part of P0 rather than a cleanup note.
- **Rollback rule:** if the six-lane shell breaks route access or surface ownership, revert to the pre-merge sidebar/top-nav contract while keeping the written plan and Phase 2 boundary intact.

## Next Step

Phase 1 is complete. The next bounded follow-on is optional hands-on validation of the merged lanes, followed by a separate Phase 2 cleanup task that can:

- shrink `Mode` to the six canonical lanes
- revisit whether `docs` should remain an anchor
- recompute `SurfaceMode`
- delete stale legacy label and icon mappings
- remove legacy-only tests only after the routes are truly gone

Do not start that cleanup until the Phase 2 entry gate above is satisfied.

## Sources and References

- [docs/specs/2026-03-10-feat-updated-ui-views-spec.md](/Users/jamiecraik/dev/trace-narrative/docs/specs/2026-03-10-feat-updated-ui-views-spec.md)
- [docs/plans/2026-03-10-feat-updated-ui-views-plan.md](/Users/jamiecraik/dev/trace-narrative/docs/plans/2026-03-10-feat-updated-ui-views-plan.md)
- [docs/plans/2026-03-11-trace-shell-redesign-brief.md](/Users/jamiecraik/dev/trace-narrative/docs/plans/2026-03-11-trace-shell-redesign-brief.md)
- [docs/reports/2026-03-11-shell-audit.md](/Users/jamiecraik/dev/trace-narrative/docs/reports/2026-03-11-shell-audit.md)
- [docs/agents/mode-registry.md](/Users/jamiecraik/dev/trace-narrative/docs/agents/mode-registry.md)
- [src/core/types.ts](/Users/jamiecraik/dev/trace-narrative/src/core/types.ts)
- [src/ui/components/Sidebar.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/Sidebar.tsx)
- [src/ui/components/TopNav.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/components/TopNav.tsx)
- [src/AppContent.tsx](/Users/jamiecraik/dev/trace-narrative/src/AppContent.tsx)
- [src/ui/views/NarrativeSurfaceView.tsx](/Users/jamiecraik/dev/trace-narrative/src/ui/views/NarrativeSurfaceView.tsx)
- [src/ui/views/narrativeSurfaceData.ts](/Users/jamiecraik/dev/trace-narrative/src/ui/views/narrativeSurfaceData.ts)
