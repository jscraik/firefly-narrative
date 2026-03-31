---
title: Branch View Developer Fast Path UI Evidence
status: in_progress
date: 2026-03-30
plan: /Users/jamiecraik/dev/trace-narrative/docs/ui-plans/2026-03-30-branch-view-developer-fast-path-ui-plan.md
ui_spec: /Users/jamiecraik/dev/trace-narrative/docs/ui-specs/2026-03-30-branch-view-developer-fast-path-ui-spec.md
branch: codex/trim-to-vision-phase2-clean
build_sha: 7ad8767
---

# Branch View Developer Fast Path UI Evidence

## Table of Contents

- [Summary](#summary)
- [Contract Lock Decisions](#contract-lock-decisions)
- [Named Approver](#named-approver)
- [Baseline Fixture Set](#baseline-fixture-set)
- [Implementation Progress](#implementation-progress)
- [Command Log](#command-log)
- [Pass/Fail Outcomes](#passfail-outcomes)
- [Telemetry Coverage Notes](#telemetry-coverage-notes)
- [Visual Proof Plan](#visual-proof-plan)
- [Residual Risks and Next Steps](#residual-risks-and-next-steps)

## Summary

- Execution lane: `plan-led`
- Current slice: `Slice 2`
- Status: `in_progress`
- Evidence path frozen for `UP0` through `UP5`
- This artifact was synchronized after the first implementation slice so the plan, spec, and code all point at the same execution record
- The workspace strip contract is now reflected in code: its content has been folded into the branch header instead of remaining a separate summary surface
- A user-approved adjacent extension is now applying the same evidence-brief visual language to app-opening surfaces so the live Tauri app reflects the redesign above the fold
- `UP3` controller and telemetry work is now landed, so the active slice has moved to `UP4` accessibility, responsive hardening, reduced-motion verification, and residual advanced-analysis measurement

## Contract Lock Decisions

1. The evidence rail may keep internal tabs in iteration one, but only behind a default-visible verification rail that resolves by verification priority.
2. `BranchSummaryBar` content folds into `WorkspaceHeaderStrip`; it does not survive as an independent first-pass surface.
3. The causal-sequence surface is a branch-specific extraction that borrows chronology framing and authority treatment from `CausalTimelineView`; it is not a blind component reuse.
4. Low-confidence thesis copy still includes factual branch context such as commit or file summary when available.
5. The canonical default DOM and visual order is:
   - `WorkspaceHeaderStrip`
   - `BranchThesisCard`
   - `WhyWeBelieveThisCard`
   - `CausalSequenceCard`
   - `EvidenceRail`
   - `RawDiffAccessCard`
   - `AdvancedAnalysisSection`
6. The canonical first-pass CTA placement is the header CTA group:
   - primary `Inspect evidence`
   - secondary `Open raw diff`
   `RawDiffAccessCard` may repeat the diff route later, but it may not become the first or only diff entry point.

## Named Approver

- Jamie Craik
  Approval basis: explicit request to execute `[$ce-work](/Users/jamiecraik/dev/agent-skills/product/ops/ce-work/SKILL.md)` against the linked UI plan on `2026-03-30`.

## Baseline Fixture Set

The following fixture classes are frozen for before and after comparison and `UP5` sign-off:

1. High-confidence branch
   Notes: branch with thesis, joined evidence, and a valid verification path.
2. Low-confidence branch
   Notes: branch with partial narrative confidence where direct evidence or raw diff should be easier to reach than interpretation.
3. Degraded or kill-switch branch
   Notes: branch where trust posture visibly reduces interpretation authority and promotes diff fallback.
4. Branch-scope reset sequence `A -> B -> A`
   Notes: used to prove stale `Ask Why`, detail level, evidence selection, timers, and expansion state do not leak across scopes.

Baseline capture status:

- Fixture classes locked: yes
- Concrete screenshot set captured: pending `UP5`
- Baseline notes captured before sign-off: yes

## Implementation Progress

- `UP0` completed
  Evidence: this artifact records the locked contract decisions, named approver, and frozen fixture classes.
- `UP1` completed
  Evidence: `src/ui/views/BranchViewLayout.tsx` now composes a calmer branch workspace with header, story rail, verification rail, and lower continuation surfaces, while `src/ui/components/BranchHeader.tsx` now absorbs the workspace strip content instead of rendering it as a separate first-pass card.
- `UP2` completed
  Evidence: `src/ui/components/BranchNarrativePanel.tsx` and `src/ui/components/BranchNarrativePanelSections.tsx` now expose thesis, why, sequence, raw-diff access, and advanced analysis separately.
- `UP3` completed
  Evidence: `src/ui/components/RightPanelTabs.tsx`, `src/ui/components/right-panel-tabs/types.ts`, `src/ui/views/branch-view/useBranchViewController.ts`, and `src/core/telemetry/narrativeTelemetry.ts` now implement controller-owned verification posture, branch-scope reset telemetry, header CTA tracking, low-confidence fallback tracking, and first-open timing for evidence and raw diff. Automated proof now exists in `src/core/telemetry/__tests__/narrativeTelemetry.test.ts`, `src/ui/components/__tests__/RightPanelTabs.test.tsx`, and `src/ui/views/__tests__/BranchView.test.tsx`.
- Adjacent opening-surface extension completed
  Evidence: `src/ui/views/DashboardMainContent.tsx`, `src/ui/components/dashboard/SignalStrip.tsx`, and `src/ui/views/RepoEvidenceOverview.tsx` now adopt the same authority-first, evidence-brief hierarchy so the Tauri app opening surfaces do not remain visually older than the redesigned branch workspace.
- `UP4` in progress
- `UP4` scope: accessibility and responsive hardening, with advanced-analysis disclosure semantics, reset behavior, telemetry proof, verification-rail roving focus, header CTA grouping semantics, workspace-order proof, narrow-width control wrapping, reduced-motion-safe verification jumping, and focus-visible primary controls now landed in code
- `UP5` pending

## Command Log

```text
pnpm test src/core/telemetry/__tests__/narrativeTelemetry.test.ts  ->  pass
pnpm test src/ui/components/__tests__/RightPanelTabs.test.tsx  ->  pass
pnpm test src/ui/components/__tests__/BranchHeader.test.tsx  ->  pass
pnpm test src/ui/components/__tests__/BranchNarrativePanel.test.tsx  ->  pass
pnpm test src/ui/views/__tests__/BranchView.test.tsx  ->  pass
pnpm test:a11y  ->  pass
pnpm typecheck  ->  pass
pnpm test  ->  pass
pnpm test:deep  ->  pass
```

- `pnpm test src/core/telemetry/__tests__/narrativeTelemetry.test.ts`
  Result: pass (`13` tests)
- `pnpm test src/ui/components/__tests__/RightPanelTabs.test.tsx`
  Result: pass (`7` tests)
- `pnpm test src/ui/components/__tests__/BranchHeader.test.tsx`
  Result: pass (`6` tests)
  Notes: proves the first-pass action cluster is exposed as one semantic group before deeper workspace controls
- `pnpm test src/ui/components/__tests__/BranchNarrativePanel.test.tsx`
  Result: pass (`20` tests)
  Notes: proves advanced-analysis disclosure stays collapsed by default, resets on branch-scope change, reports advanced-analysis interaction callbacks cleanly, and exposes the story detail control group semantically
- `pnpm test src/ui/views/__tests__/BranchView.test.tsx`
  Result: pass (`26` tests)
  Notes: now includes controller telemetry proof for `branch_advanced_analysis_opened`, `branch_advanced_control_used`, branch-scope reset of advanced workspace detail, integrated proof that header CTAs stay ahead of advanced-analysis controls in workspace order, and reduced-motion-safe verification jumping
- `pnpm test:a11y`
  Result: pass (`32` tests across branch header and branch view lanes)
  Notes: replays the accessibility-focused branch workspace suite with the reduced-motion verification path active
- `pnpm typecheck`
  Result: pass
  Notes: current worktree now clears the previous MermaidDiagram blocker; the `.npmrc` `${NPM_TOKEN}` warning remains non-blocking noise
- `pnpm test`
  Result: pass (`520` tests across `60` files)
  Notes: non-blocking warnings only from jsdom canvas support, one ECharts sizing stderr line, and the existing React `whileHover` warning in docs-panel tests
- `pnpm test:deep`
  Result: pass
  Notes: includes refreshed `pnpm test`, `pnpm test:integration`, and `pnpm test:a11y` after the reduced-motion and focus-visible hardening pass

## Pass/Fail Outcomes

- `narrativeTelemetry.test.ts`
  Outcome: pass
  Coverage: telemetry dispatch contract including branch-scope reset payload structure
- `RightPanelTabs.test.tsx`
  Outcome: pass
  Coverage: verification posture header, evidence-priority defaulting, diff-first fallback, controller-owned posture override, and roving tab focus with horizontal tab semantics
- `BranchView.test.tsx`
  Outcome: pass
  Coverage: branch workspace integration, verification-mode telemetry, branch-scope reset telemetry, header CTA instrumentation, advanced-analysis telemetry, advanced workspace disclosure reset, CTA precedence before advanced-analysis controls, and reduced-motion-safe verification jumping
- `BranchHeader.test.tsx`
  Outcome: pass
  Coverage: first-pass action grouping semantics and keyboard-safe exposure of the header CTA cluster
- `BranchNarrativePanel.test.tsx`
  Outcome: pass
  Coverage: advanced-analysis disclosure semantics, default-collapsed behavior, branch-scope reset, advanced-control callback wiring, and semantic grouping for story detail controls
- Repo-wide `typecheck`
  Outcome: pass
  Coverage: current worktree type safety across the refactor slice and adjacent opening-surface extension
- Full test suite and deep validation suite
  Outcome: pass
  Coverage: current repo-wide validation baseline including integration and accessibility lanes

## Telemetry Coverage Notes

- Implemented in code and now backed by targeted proof:
  - `branch_fast_path_loaded`
  - `branch_primary_cta_used`
  - `branch_advanced_analysis_opened`
  - `branch_advanced_control_used`
  - `branch_low_confidence_fallback_used`
  - `branch_evidence_open_time_ms`
  - `branch_story_to_diff_time_ms`
  - `branch_verification_mode_selected`
  - `branch_scope_reset_occurred`
- Current proof sources:
  - `src/core/telemetry/__tests__/narrativeTelemetry.test.ts`
  - `src/ui/components/__tests__/BranchNarrativePanel.test.tsx`
  - `src/ui/components/__tests__/RightPanelTabs.test.tsx`
  - `src/ui/views/__tests__/BranchView.test.tsx`
- Reused versus new event inventory and before or after timing comparison notes remain a `UP5` packaging task, not an implementation blocker for the landed `UP3` slice

## Visual Proof Plan

- Live UI proof will be captured from the real app, not a standalone mock.
- Planned review modes:
  - desktop dashboard first viewport
  - desktop branch workspace
  - tablet branch workspace
  - mobile branch workspace
  - branch-scope reset sequence `A -> B -> A`
- Latest code-level visual shift:
  - `DashboardMainContent` now opens with a stronger hero, first-pass action rail, and calmer evidence-ranked hierarchy
  - `SignalStrip` now reads as a compact premium KPI row instead of generic large metric tiles
  - `RepoEvidenceOverview` now uses an evidence-brief hero and verification-path card that matches the branch workspace direction
  - first-pass summary strip is merged into the branch header
  - evidence and diff CTAs now sit in the header action card before the story rail
- Required proof still pending:
  - screenshot set for the frozen fixture classes
  - explicit evidence that raw diff remains reachable before file-level detail

## Residual Risks and Next Steps

- `UP4` still needs screenshot-backed responsive evidence across the frozen fixture set beyond the landed disclosure, focus, reduced-motion, CTA-order, and wrapping hardening.
- `UP5` still needs final screenshot capture, reused versus new telemetry inventory, and sign-off packaging for `UAC11`.
- Existing unrelated worktree edits remain outside this execution record and were preserved.
