# UI Views Rollout Plan Evidence

<!-- This file is required before the Updated UI Views feature can merge. -->
<!-- Ref: docs/plans/2026-03-10-feat-updated-ui-views-plan.md Phase 5 -->

## Table of Contents

- [Command Log](#command-log)
- [Pass/Fail Outcomes](#passfail-outcomes)
- [Telemetry Evidence](#telemetry-evidence)
- [Screenshots](#screenshots)
- [Risk Matrix](#risk-matrix)
- [Residual Risk Notes](#residual-risk-notes)
- [Rollback Decision](#rollback-decision)
- [Monitor Window Handoff](#monitor-window-handoff)
- [Owner Sign-Off](#owner-sign-off)

## Command Log

```text
pnpm test -- src/core/telemetry/__tests__/narrativeTelemetry.test.ts  ->  clean (51 files, 431 tests passed)
pnpm docs:lint  ->  clean (Vale + markdownlint)
pnpm check      ->  clean (design-guidance, lint, docs:lint, typecheck, test, audit)
pnpm test:deep  ->  clean (unit + integration + a11y all passed)
```

- `pnpm test -- src/core/telemetry/__tests__/narrativeTelemetry.test.ts` on `2026-03-12`: `431/431` tests passed with telemetry coverage (`narrativeTelemetry.test.ts`: `12/12` pass)
- `pnpm docs:lint` on `2026-03-12`: clean (`0` Vale errors, `0` markdownlint errors)
- `pnpm check` on `2026-03-12`: clean (design guidance, lint, docs lint, typecheck, test, and audit all passed)
- `pnpm test:deep` on `2026-03-12`: clean (`431/431` unit tests + `1/1` integration + `23/23` a11y tests passed)

## Pass/Fail Outcomes

- `dashboardState.test.ts`: `3` pass, `0` fail
  Notes: trust state mapping, OTEL_ONLY, unknown modes
- `NarrativeSurfaceView.test.tsx`: `6` pass, `0` fail
  Notes: authority cues, OTEL-only `derived_summary`, degraded badge, per-element data-authority attributes
- `narrativeSurfaceData.test.ts`: `37` pass, `0` fail
  Notes: contract matrix across all `24` `SurfaceMode` values, routing boundary, tier coverage, drift-state framing
- `narrativeSurfaceProvenance` coverage:
  - `NarrativeSurfaceView.test.tsx`: `7` pass, `0` fail
  - `narrativeSurfaceData.test.ts`: `37` pass, `0` fail
  Notes: shared-surface provenance rail render, authority-tier coverage, degraded trust gating
- `Sidebar.test.tsx`: `34` pass, `0` fail
  Notes: canonical labels, sections, no legacy aliases, routing completeness
- `TopNav.test.tsx`: `4` pass, `0` fail
  Notes: anchor-only tabs, keyboard navigation, Narrative anchor remains active for shared surfaces
- `TrustStateIndicator.test.tsx`: `19` pass, `0` fail
  Notes: all trust states, recovery affordances, stale-state clearing, button interactions
- `docsAutoLoad.test.ts`: `2` pass, `0` fail
  Notes: stale auto-load success and error are ignored after route changes
- `DashboardView.test.tsx`: `5` pass, `0` fail
  Notes: stale dashboard data and errors are discarded when repo requests are superseded
- `BranchView.test.tsx`: `18` pass, `0` fail
  Notes: stale evidence, raw-diff, and ask-why callbacks are ignored after branch-scope changes
- `narrativeTelemetry.test.ts`: `12` pass, `0` fail
  Notes: schema `v1`, consent gating, payload sanitization, pseudonymized identifiers, canonical event dispatch

## Telemetry Evidence

- Current shared dispatch channel is `narrative:telemetry`, with `schemaVersion: 'v1'` on the canonical envelope.
- Current release-relevant narrative event families are:
  - `what_ready`
  - `first_win_completed`
  - `narrative_viewed`
  - `layer_switched`
  - `evidence_opened`
  - `fallback_used`
  - `feedback_submitted`
  - `rollout_scored`
  - `kill_switch_triggered`
  - `ui.quality.render_decision`
- Current dashboard event families are:
  - `dashboard_retry_budget_exhausted`
  - `dashboard_state_transition`
  - `dashboard_action`
  - `dashboard_source_authority`
  - `dashboard_command_authority_denied`
  - `open_repo`
  - `import_session`
  - `permission_denied`
  - `apply_filter`
  - `clear_filter`
  - `view_activity`
- Local validation confirms the telemetry contract now uses the narrative/dashboard event set above rather than the older `ui_mode_changed`, `cockpit_view_rendered`, and `cockpit_action_blocked` names referenced in the original rollout draft.
- Release-candidate telemetry spot check completed on `2026-03-12` via `pnpm test -- src/core/telemetry/__tests__/narrativeTelemetry.test.ts`; contract assertions and pseudonymized payload checks remain green.
- Evidence sources:
  - `src/core/telemetry/narrativeTelemetry.ts`
  - `src/ui/views/branch-view/useBranchTelemetry.ts`
  - `src/ui/views/branch-view/useBranchViewController.ts`
  - `src/core/telemetry/__tests__/narrativeTelemetry.test.ts`

## Screenshots

- Narrative Brief empty state
  Artifact: `artifacts/screenshots/ui-views-rollout-2026-03-12/dashboard-empty-state.png`
  Notes: confirms narrative-first shell, persistent TopNav, and Codex-first empty-state framing
- Trust Center shared surface
  Artifact: `artifacts/screenshots/ui-views-rollout-2026-03-12/trust-center-surface.png`
  Notes: confirms narrative-first health surface framing, retained sidepanel layout, and new signature provenance lane
- Story Map critical signal state
  Artifact: `artifacts/screenshots/ui-views-rollout-2026-03-12/story-map-critical-signal.png`
  Notes: confirms red signal authority badge rendering (`SIGNAL FROM DRIFT GUARDRAIL EVALUATION`) on critical drift status

## Risk Matrix

- Helper drift or duplicate mapping path
  Likelihood: low
  Impact: high
  Owner: Jamie Craik
  Status: mitigated
- OTEL-only UI assertion became flaky
  Likelihood: low
  Impact: medium
  Owner: Jamie Craik
  Status: mitigated
- Hidden regressions in docs autoload and stale request handling
  Likelihood: low
  Impact: medium
  Owner: Jamie Craik
  Status: mitigated
- Scope creep: per-mode live data adapter added without gating
  Likelihood: medium
  Impact: high
  Owner: Jamie Craik
  Status: open
- Rollout monitor names drift from canonical telemetry schema
  Likelihood: medium
  Impact: medium
  Owner: Jamie Craik
  Status: open

## Residual Risk Notes

- Many shared modes still intentionally rely on `static_scaffold` or `derived_summary` authority until richer live adapters are wired.
- `assistant` mode intentionally uses `static_scaffold` authority in this phase; promotion to live data requires a separate plan.
- Badge counts in the sidebar remain static placeholders; live-derived counts remain deferred.
- Release-candidate telemetry spot check passed on `2026-03-12`; monitor window should still watch fallback, kill-switch, and retry-budget trends after merge.

## Rollback Decision

- Rollback trigger: any sustained increase in `ui.quality.render_decision` over-budget events, `fallback_used`, `kill_switch_triggered`, or dashboard retry-budget exhaustion after merge.
- Rollback path: revert shared trust helper and shared-surface contract changes, then gate non-anchor modes to the last known-safe scaffolded surface set.
- Owner decision required before merge: Jamie Craik must confirm implementation, platform, and release go or no-go after a release-candidate telemetry spot check.

## Monitor Window Handoff

- Window: `30` minutes after merge during weekday off-peak
- Signals to watch:
  - `ui.quality.render_decision`
  - `narrative_viewed`
  - `what_ready`
  - `fallback_used`
  - `kill_switch_triggered`
  - `dashboard_retry_budget_exhausted`
  - `permission_denied`
- Alert threshold: any sustained increase in fallback, kill-switch, retry-budget, or permission-denied events versus baseline pauses rollout.
- Handoff contact: Jamie Craik (`trace-narrative` implementation, platform, and release owner)

## Owner Sign-Off

- Implementation owner: Jamie Craik
  Sign-off date: pending rollout review
- Platform owner: Jamie Craik
  Sign-off date: pending release-candidate telemetry review
- Release owner: Jamie Craik
  Sign-off date: pending go or no-go
