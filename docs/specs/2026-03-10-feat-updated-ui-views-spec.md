---
title: Updated UI Views Contract
type: feat
status: accepted
date: 2026-03-10
origin: /Users/jamiecraik/dev/trace-narrative/docs/brainstorms/2026-03-10-updated-ui-views-brainstorm.md
risk: medium
spec_depth: full
updated: 2026-03-29
---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Enhancement Summary](#enhancement-summary)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [System Boundary](#system-boundary)
- [Core Domain Model](#core-domain-model)
- [Main Flow / Lifecycle](#main-flow--lifecycle)
- [Interfaces and Dependencies](#interfaces-and-dependencies)
- [Invariants / Safety Requirements](#invariants--safety-requirements)
- [Failure Model and Recovery](#failure-model-and-recovery)
- [Acceptance and Test Matrix](#acceptance-and-test-matrix)
- [Definition of Done](#definition-of-done)

## Problem Statement

Trace Narrative had already converged visually on six core jobs, but the runtime contract still carried a broader route taxonomy. That mismatch leaked into shell navigation, top-nav framing, tests, and docs, making the app feel more sprawling than the intended operator experience.

The current contract resolves that mismatch by shrinking the shell to six canonical modes and moving docs access into Settings instead of preserving it as a standalone route.

## Enhancement Summary

**Updated on:** 2026-03-29
**Key areas improved:** route ownership, docs placement, shared-surface scope, and final-contract validation

- Reduced the canonical shell to six modes only.
- Reduced anchors to `dashboard` and `repo`.
- Embedded docs access inside Settings instead of preserving `docs` as an anchor route.
- Tightened shared-surface coverage to the four surviving non-anchor lanes.
- Removed shell-time legacy-route ownership remapping from navigation and tests.

## Goals

1. Keep the visible shell constrained to `dashboard`, `repo`, `sessions`, `tools`, `hygiene`, and `settings`.
2. Preserve `dashboard` as the narrative-first entry point and `repo` as the evidence-rich branch workspace.
3. Keep `sessions`, `tools`, `hygiene`, and `settings` inside a shared surface contract with trust-aware framing.
4. Make Settings the home for both operator configuration and repository docs access.
5. Keep canonical Trace Narrative naming in user-visible copy and tests.

## Non-Goals

1. Rewriting repo indexing, session linking, telemetry ingestion, or Tauri persistence.
2. Replacing `BranchView` or `DashboardView` with a universal surface.
3. Inventing new top-level shell destinations beyond the six-lane contract.
4. Turning settings or hygiene into new broad taxonomies that recreate the old sprawl.
5. Preserving the older hidden-route model as a permanent runtime abstraction.

## System Boundary

### Owned by this spec

1. Top-level shell behavior for the canonical six modes.
2. Flat primary navigation in the sidebar.
3. Anchor versus shared-surface routing boundaries.
4. Docs placement inside Settings.
5. Shared-surface trust framing and authority cues.
6. Acceptance criteria for routing, labels, and test coverage.

### Not owned by this spec

1. Internal logic of repo indexing, attribution, session import, or trace ingestion.
2. Detailed branch narrative composition inside `BranchView`.
3. Narrative file generation internals behind `DocsOverviewPanel`.
4. Telemetry schema redesign outside UI-view validation.

### Ownership map

1. `src/AppContent.tsx` owns mode routing and anchor selection.
2. `src/ui/components/Sidebar.tsx` owns visible shell destinations and sidebar actions.
3. `src/ui/components/TopNav.tsx` owns page framing for the canonical six modes.
4. `src/ui/views/DashboardView.tsx` owns aggregate dashboard behavior and drill-down initiation.
5. `src/ui/views/BranchView.tsx` owns repo evidence, branch narrative, and filtered drill-down resolution.
6. `src/ui/views/NarrativeSurfaceView.tsx` owns the shared presentation contract for `sessions`, `tools`, `hygiene`, and `settings`.
7. `src/ui/views/SettingsView.tsx` owns the settings lane and embedded docs access.
8. `src/ui/views/narrativeSurfaceData.ts` owns per-surface framing, copy, and summary structures for the surviving shared surfaces.

## Core Domain Model

### Primary entities

1. `Mode`
   Canonical top-level route selector:
   - `dashboard`
   - `repo`
   - `sessions`
   - `tools`
   - `hygiene`
   - `settings`
2. `AnchorMode`
   `dashboard | repo`. These use dedicated views with distinct behavior and bypass the shared surface.
3. `SurfaceMode`
   `sessions | tools | hygiene | settings`.
4. `ViewSection`
   One of `Narrative`, `Evidence`, `Workspace`, `Integrations`, `Health`, or `Configure`. This is internal framing metadata, not a visible sidebar-grouping contract.
5. `RepoState`
   Top-level repo availability state: `idle`, `loading`, `error`, or `ready`.
6. `CaptureReliabilityStatus`
   Existing source of truth for reliability and stream health.
7. `SurfaceTrustState`
   UI-facing trust overlay for shared surfaces. Values: `healthy` or `degraded`. Derived from `CaptureReliabilityStatus`.
8. `NarrativeSurfaceViewModel`
   Presentation contract for a shared surface page: `section`, `title`, `subtitle`, `hero`, `metrics`, `highlights`, `activity`, `table`, `footerNote`, and `trustState`.
9. `DataAuthorityTier`
   Declares how trustworthy a rendered fact is:
   - `live_repo`
   - `live_capture`
   - `derived_summary`
   - `static_scaffold`
   - `system_signal`

### Normalization rules

1. Every `Mode` must resolve to exactly one view family: anchor or shared surface.
2. The sidebar is always a flat six-item list.
3. Hidden-route owner remapping is no longer part of the runtime contract.
4. Docs access must be reachable from Settings, not through a separate shell route.
5. Trust overlays continue to derive from capture reliability:
   - `HYBRID_ACTIVE` maps to `healthy`
   - `OTEL_ONLY` maps to `healthy`, but must stay visibly baseline-only
   - `DEGRADED_STREAMING`, `FAILURE`, or an unhealthy expected stream map to `degraded`
6. User-visible naming must use `Trace Narrative` and `trace-narrative`.
7. Every hero, metric, highlight, activity item, and summary row in a shared surface must expose authority metadata.
8. Shared-surface actions may bridge back to `repo`, `dashboard`, `sessions`, `tools`, `hygiene`, or `settings`, but they may not navigate to deleted legacy shell modes.

### Canonical mode matrix

| Mode | View family | Visible in primary nav | Metadata section | Shell label | Initial authority posture |
| --- | --- | --- | --- | --- | --- |
| `dashboard` | anchor | yes | Narrative | Narrative Brief | `derived_summary` |
| `repo` | anchor | yes | Workspace | Repo Evidence | `live_repo` |
| `sessions` | surface | yes | Evidence | Sessions | `derived_summary` |
| `tools` | surface | yes | Integrations | Tools | `static_scaffold` |
| `hygiene` | surface | yes | Health | Hygiene | `live_capture` |
| `settings` | surface | yes | Configure | Settings | `static_scaffold` |

## Main Flow / Lifecycle

### 1. Application entry

1. App loads into the shell with a flat primary sidebar visible.
2. Default mode is `dashboard`.
3. Repo-related data and capture-reliability state initialize through existing hooks.
4. Shell determines which view family to render based on `mode`.

### 2. Mode selection

1. Operator selects one of the six visible sidebar destinations.
2. `AppContent.tsx` updates `mode`.
3. Rendering contract resolves:
   - `dashboard` renders `DashboardView`
   - `repo` renders `BranchView` or a repo empty, loading, or error state
   - `sessions`, `tools`, `hygiene`, and `settings` render through `NarrativeSurfaceView`
4. Top navigation frames the selected page using canonical mode metadata only.

### 3. Anchor behavior

1. `dashboard` remains the aggregate operator overview and may initiate drill-down into `repo`.
2. `repo` remains the evidence-rich narrative workspace for commits, files, sessions, and snapshots.

### 4. Shared-surface behavior

1. Shared surfaces render through one layout contract with lane framing, trust badge, hero area, metrics, highlights, activity, and operator summary table.
2. `sessions` remains the dedicated evidence-review lane.
3. `tools` remains the tool posture and usage lane.
4. `hygiene` becomes the merged operational follow-through lane for trust, env posture, setup readiness, and live capture cues.
5. `settings` owns scan roots, provider posture, operator defaults, and embedded docs access.
6. Shared surfaces must always offer a credible return path to repo evidence or the dashboard when deeper inspection is required.

## Interfaces and Dependencies

1. `src/core/types.ts` defines the authoritative mode, anchor, and surface unions.
2. `src/AppContent.tsx` must stay aligned with `AnchorMode`.
3. `src/ui/components/Sidebar.tsx` and `src/ui/components/TopNav.tsx` must agree on the canonical six labels.
4. `src/ui/views/NarrativeSurfaceView.tsx` and `src/ui/views/narrativeSurfaceData.ts` together define the shared-surface contract.
5. `src/ui/views/SettingsView.tsx` depends on `DocsOverviewPanel` for repository docs access.

## Invariants / Safety Requirements

1. The shell may not reintroduce removed legacy modes into primary navigation without a new approved spec.
2. Settings may expose docs access, but it may not silently claim docs are available when no repo root is present.
3. Shared surfaces may use scaffolded content, but scaffolded content must still carry authority cues.
4. Degraded trust must stay visible; it may not be hidden behind normal-looking success framing.
5. Hygiene and Settings must remain focused lanes, not dumping grounds for unrelated operator concepts.

## Failure Model and Recovery

1. `repo_loading`
   Repo mode is selected while indexing is in progress. Recovery: show loading shell and preserve the repo route.
2. `repo_error`
   Repo loading or indexing fails. Recovery: keep the route active, show user-readable error text, and preserve the open-repo affordance.
3. `docs_unavailable`
   Settings is open without a ready repo root. Recovery: render the embedded repository placeholder instead of pretending docs exist.
4. `capture_degraded`
   Shared surface trust is degraded while content remains usable. Recovery: keep the page usable, show degraded trust, and route the operator toward hygiene or repo evidence.

## Acceptance and Test Matrix

| Contract area | Expected behavior | Validation |
| --- | --- | --- |
| Mode unions | Only six canonical modes remain | Typecheck plus unit assertions |
| Anchor routing | Only `dashboard` and `repo` bypass the shared surface | App-content and routing tests |
| Sidebar contract | Sidebar shows only six primary items and no section headers | Sidebar tests |
| Top-nav framing | Top nav labels and sections are defined only for canonical modes | Top-nav tests |
| Shared-surface contract | `ALL_SURFACE_MODES` equals `sessions`, `tools`, `hygiene`, `settings` | `narrativeSurfaceData` tests |
| Hygiene lane | Hygiene remains the merged trust/env/setup/capture lane | `NarrativeSurfaceView` tests |
| Settings docs placement | Docs access is visible inside Settings | `NarrativeSurfaceView` plus `DocsOverviewPanel` tests |
| Repo evidence actions | Supporting action cards route only into surviving lanes | `RepoEvidenceOverview` tests |

## Definition of Done

1. Runtime types, routing, shell framing, and tests all agree on the same six-mode contract.
2. Docs access is reachable from Settings without a dedicated `docs` shell route.
3. No shared-surface action navigates to a removed legacy mode.
4. The authoritative docs in `docs/specs`, `docs/reports`, and `docs/agents` describe the same final shell contract.
