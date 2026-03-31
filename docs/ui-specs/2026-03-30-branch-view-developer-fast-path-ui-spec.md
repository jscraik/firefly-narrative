---
title: Branch View Developer Fast Path UI Spec
type: refactor
status: active
execution_status: in_progress
date: 2026-03-30
deepened: 2026-03-30
parent_spec: /Users/jamiecraik/dev/trace-narrative/docs/specs/2026-03-10-feat-updated-ui-views-spec.md
origin: /Users/jamiecraik/dev/trace-narrative/src/ui/views/BranchViewLayout.tsx
wcag_level: AA
---

## Table of Contents

- [Overview](#overview)
- [Enhancement Summary](#enhancement-summary)
- [Execution Tracking](#execution-tracking)
- [Component Inventory](#component-inventory)
- [State Ownership Contract](#state-ownership-contract)
- [Interaction States](#interaction-states)
- [Design Tokens](#design-tokens)
- [Interaction Flows](#interaction-flows)
- [Accessibility Requirements](#accessibility-requirements)
- [Responsive Behaviour](#responsive-behaviour)
- [Telemetry Contract and UX Success Metrics](#telemetry-contract-and-ux-success-metrics)
- [Visual Acceptance Criteria](#visual-acceptance-criteria)
- [Out of Scope](#out-of-scope)
- [Decision Log](#decision-log)

## Overview

This spec defines a dedicated UI contract for making the repo branch workspace feel professional, trust-aware, and easy to understand on first read.

The current branch experience already has the right underlying evidence and narrative primitives, but it distributes comprehension across too many simultaneous surfaces:

1. `RepoEvidenceOverview`
2. `BranchSummaryBar`
3. `BranchHeader`
4. `BranchNarrativePanel`
5. collapsed details (`NarrativeGovernancePanel`, `DecisionArchaeologyPanel`, `CaptureActivityStrip`)
6. right-panel tabs
7. separate diff dock
8. lower file-change and intent surfaces

That composition is powerful for a returning operator, but it is not the fastest safe path for a developer who needs to understand:

1. what this branch is about
2. why the app believes that
3. what evidence supports it
4. where to verify or falsify it quickly

This UI spec redefines the branch workspace as an authority-first reading flow:

1. branch thesis
2. causal sequence
3. evidence and trust rail
4. raw diff access
5. advanced analysis and feedback

The design intent is "evidence brief" rather than "control cockpit." The surface must feel intentional and premium without becoming opaque or over-designed.

### Parent context

This spec inherits the six-lane shell and mode framing from [docs/specs/2026-03-10-feat-updated-ui-views-spec.md](/Users/jamiecraik/dev/trace-narrative/docs/specs/2026-03-10-feat-updated-ui-views-spec.md). It only changes the `repo` branch workspace presentation contract. It does not change the global shell taxonomy.

Execution note:
- The formal acceptance contract remains scoped to the `repo` branch workspace.
- A user-approved adjacent implementation may apply the same visual language to opening surfaces such as `src/ui/views/DashboardMainContent.tsx` and the top `RepoEvidenceOverview` layer so the shipped app reflects the branch fast-path direction immediately.
- That adjacent work may not loosen any branch-scope reset, verification-priority, or trust-state requirements defined in this spec.

### UI goals

1. Make the branch workspace understandable within one screenful on desktop.
2. Put chronology and evidence ahead of narrative interpretation.
3. Preserve trust-state visibility and low-confidence fallback behavior.
4. Keep advanced interaction controls available without making them part of the default reading burden.
5. Reuse the strongest visual and authority patterns already present in `CausalTimelineView`.

## Enhancement Summary

**Deepened on:** 2026-03-30
**Mode:** targeted-confidence
**Key areas improved:** state precedence, branch-scope reset behavior, evidence-rail defaults, telemetry, visual validation, contract lock

- Added explicit state-precedence and reset rules so planning does not need to invent how the new branch fast path behaves when branch context changes or trust posture degrades.
- Added stronger evidence-rail defaulting and fallback rules so the verification path is deterministic instead of left to implementation interpretation.
- Extended the telemetry and `VAC` matrix so planning can prove whether the refactor actually improves time-to-verification and reduces first-pass confusion.
- Resolved the execution-critical UI contract questions so planning and implementation no longer have to guess about tabs, summary-bar survival, causal-sequence reuse, or low-confidence copy.

## Execution Tracking

**Execution status:** `in_progress`
**Governing plan:** [2026-03-30-branch-view-developer-fast-path-ui-plan.md](/Users/jamiecraik/dev/trace-narrative/docs/ui-plans/2026-03-30-branch-view-developer-fast-path-ui-plan.md)
**Evidence artifact:** [branch-view-developer-fast-path-ui-evidence.md](/Users/jamiecraik/dev/trace-narrative/artifacts/branch-view-developer-fast-path-ui-evidence.md)

Implementation is now aligned to the following shipped contract slices:

- The workspace frame has been recomposed toward the spec-defined header, story, and verification model.
- The story rail has been decomposed into thesis, why, sequence, raw-diff access, and advanced-analysis boundaries.
- Verification posture messaging and branch-scope reset behavior have started landing behind the right rail contract.
- The shared visual language is also being extended into app-opening surfaces so the branch fast-path no longer feels visually disconnected from the Tauri app's first viewport.

The remaining work is not contract discovery. It is completion work:

1. finish telemetry and reset proof for `UP3`
2. harden accessibility and responsive behavior for `UP4`
3. capture visual proof and broader validation for `UP5`

## Component Inventory

### 1. Branch workspace frame

**Owner:** `src/ui/views/BranchViewLayout.tsx`

The branch workspace must be recomposed into three vertical layers:

1. `WorkspaceHeaderStrip`
   A slim top strip for branch scope, repo evidence posture, and the primary verification CTA.
2. `PrimaryStoryGrid`
   The main two-column canvas.
3. `AdvancedAnalysisSection`
   Lower-priority analysis, controls, and file-level follow-through.

### 2. WorkspaceHeaderStrip

**Existing inputs:** `RepoEvidenceOverview`, `BranchSummaryBar`, `BranchHeader`

**Contract:**

1. Show branch identity and trust posture first.
2. Avoid dense metrics or secondary actions that dilute the branch thesis.
3. Offer exactly one primary CTA and one secondary CTA:
   - primary: `Inspect evidence`
   - secondary: `Open raw diff`
4. Own the canonical first-pass CTA group for the branch workspace. No later card may become the only path to evidence or raw diff.
5. Keep the visual height compact enough that the primary story remains visible above the fold on desktop.

**Content contract:**

1. branch name
2. trust badge / capture posture
3. high-level branch counts when available
4. one-line branch thesis if narrative confidence is available

### 2a. Canonical default reading order and CTA placement

The branch workspace must use one canonical visual and DOM order across all breakpoints:

1. `WorkspaceHeaderStrip`
2. `BranchThesisCard`
3. `WhyWeBelieveThisCard`
4. `CausalSequenceCard`
5. `EvidenceRail`
6. `RawDiffAccessCard`
7. `AdvancedAnalysisSection`

CTA placement contract:

1. `Inspect evidence` lives in `WorkspaceHeaderStrip` and is the canonical primary CTA.
2. `Open raw diff` lives in `WorkspaceHeaderStrip` as the canonical secondary CTA.
3. `RawDiffAccessCard` may repeat or elaborate the raw diff route, but it may not be the first or only diff entry point.
4. `EvidenceRail` may surface additional evidence actions, but it may not displace the header CTA group as the first actionable verification controls.

### 3. PrimaryStoryGrid

**Layout contract:**

Desktop:

1. left column: `minmax(0, 1.7fr)`
2. right column: `minmax(320px, 0.95fr)`

Tablet:

1. single-column stack
2. evidence rail collapses below causal sequence

Mobile:

1. single-column stack
2. raw diff CTA stays pinned near the top action group

### 4. BranchStoryRail

**Primary owner:** evolved `BranchNarrativePanel`

The current `BranchNarrativePanel` must be decomposed into four default-visible cards:

1. `BranchThesisCard`
   One short summary of what changed and the current confidence/trust posture.
2. `WhyWeBelieveThisCard`
   A compact explanation of the evidence mix that produced the current interpretation.
3. `CausalSequenceCard`
   A chronology-first surface that reuses the authority and step framing patterns from `CausalTimelineView`.
4. `RawDiffAccessCard`
   A continuation card that explains the raw diff handoff and repeats the diff route without becoming the first or only diff entry point.

The left rail must feel document-like rather than widget-like. Each card must answer one question only.

### 5. EvidenceRail

**Primary owner:** evolved `RightPanelTabs`

The right rail becomes a dedicated verification column with three prioritized blocks:

1. `TrustAndAuthorityCard`
   Shows trust state, confidence label, and fallback readiness.
2. `EvidencePreviewCard`
   Shows the strongest 3-5 evidence links or evidence groups.
3. `VerificationNextStepCard`
   Presents the best next validating action based on trust state and available evidence.

The right rail may still use tabs internally, but tab semantics must not be the first thing a user has to understand. The default state should feel like a single visible verification rail, not a hidden drawer system.

### 5a. Evidence-rail default selection

The evidence rail must choose its initial visible content by verification priority, not by historical component default.

Default selection order:

1. attribution or trace-backed evidence preview when attribution content exists
2. validation or test evidence preview when a direct validating artifact exists but attribution content does not
3. session preview when session excerpts exist but no stronger direct validating artifact is available
4. raw diff-focused verification card when none of the above are present or trust posture requires immediate fallback

This replaces the current implicit `session`-first default as the branch fast-path contract.

### 6. AdvancedAnalysisSection

This section owns all lower-priority controls and must render below the primary story on all breakpoints.

Includes:

1. `DecisionArchaeologyPanel`
2. `NarrativeGovernancePanel`
3. `CaptureActivityStrip`
4. `AskWhyAnswerCard`
5. feedback-role switching and highlight feedback actions
6. intent list
7. file-change detail

### 7. Progressive disclosure boundary

The following items must not appear in the default visible branch thesis area:

1. audience switching
2. feedback-role switching
3. `Missing decision`
4. highlight correctness voting
5. freeform `Ask Why`

They belong to advanced analysis because they are useful after orientation, not during orientation.

### 8. Reset and persistence rules

The branch fast-path must reset lightweight interpretation controls on branch-scope change and preserve only the state that materially improves immediate verification.

Required reset rules:

1. branch-scope changes reset advanced analysis to `collapsed`
2. branch-scope changes reset the evidence rail to its verification-priority default
3. branch-scope changes clear any stale `Ask Why` answer content
4. branch-scope changes may preserve selected session only when it is still linked to the new branch context; otherwise the rail must reselect based on the defaulting rules above

Allowed persistence:

1. scroll position inside advanced analysis may reset
2. trust-state messaging must always reflect current branch scope, not prior scope
3. raw diff expansion may persist only within the current branch scope and must collapse when the branch identity changes
4. `detailLevel` must reset to `summary` on branch-scope change unless the current workspace state forces a stricter fallback such as `kill_switch`
5. staged reveal timers and animation state must key off a branch-scope token and cancel on branch-scope change before new content resolves

## State Ownership Contract

The branch fast path must use one explicit branch-scope token, referred to here as `branchScopeKey`, to prevent stale interpretation state from surviving a branch change.

| State | Primary owner | Default or persistence rule | Reset trigger | Contract note |
| --- | --- | --- | --- | --- |
| `branchScopeKey` | `useBranchViewController` | derived from active branch identity plus any branch-defining filter state | recomputed on branch change or branch-defining filter change | all resettable branch-fast-path state must key off this token |
| staged reveal step and timers | `useBranchViewController` | may stage within a branch scope only | cancel immediately when `branchScopeKey` changes | reveal timing may not leak prior-branch readiness into the new scope |
| staged reveal animation state | `useBranchViewController` | may animate only within the active branch scope | reset immediately when `branchScopeKey` changes or trust posture forces fallback | animation progress is folded into the same branch-scoped reveal contract as the timers |
| advanced-analysis disclosure | `useBranchViewController` | defaults to `collapsed` | reset on every `branchScopeKey` change | this is a workspace contract, not a child-component convenience state |
| verification posture | `useBranchViewController` | resolves to `evidence-first`, `session-first`, or `diff-first` after evidence load | recalculate on `branchScopeKey` change, trust change, or evidence availability change | posture is controller-owned so telemetry and reset logic stay truthful |
| evidence-rail internal tab or panel | `RightPanelTabs` behind controller contract | may persist only inside the active branch scope | reset when `branchScopeKey` changes or chosen content disappears | historical tab choice may not override verification-priority default |
| selected evidence item | `RightPanelTabs` behind controller contract | may persist only if still valid for the active branch scope | reset on `branchScopeKey` change or invalid evidence reference | stale evidence items must be replaced automatically before render settles |
| selected session | `RightPanelTabs` behind controller contract | may persist only when still linked to the active branch scope | reset on `branchScopeKey` change when not revalidated | session persistence is conditional, never optimistic |
| `detailLevel` | `useBranchNarrativeState` | defaults to `summary` | reset on every `branchScopeKey` change and when `kill_switch` forces diff-first posture | previous branch detail expansion may not survive into a new branch |
| audience and feedback-role controls | `useBranchNarrativeState` | advanced-only controls; no default-visible persistence requirement | reset on `branchScopeKey` change | preserve only if a future contract explicitly justifies it |
| `Ask Why` request, answer, and in-flight token | `useBranchAskWhyState` | no persistence across branch scopes | reset on every `branchScopeKey` change | stale async answers must be dropped if they return after scope change |
| raw diff expansion | `useBranchViewController` | may persist only within the active branch scope | collapse on `branchScopeKey` change | diff dominance in low-confidence states is policy, not leftover UI state |
| file selection | `useBranchViewController` with file-detail children | may persist only if the same file still exists in the active branch scope | reset on `branchScopeKey` change when file no longer matches | file-level follow-through may not point at the wrong branch |
| queued deep-link action | `useBranchViewController` | no persistence across branch scopes | clear on every `branchScopeKey` change | deferred scroll or open actions from the old scope must be discarded |

## Interaction States

### Workspace-level states

1. `loading`
   The branch workspace is resolving branch model, file list, or evidence inputs.
2. `ready`
   Branch thesis, sequence, and evidence rail are available.
3. `empty`
   Repo is present but no branch evidence exists yet.
4. `error`
   Branch workspace cannot render a trustworthy story.
5. `degraded`
   Trust and capture posture are degraded, but usable evidence remains.
6. `kill_switch`
   Narrative layers are read-only and raw diff is the dominant interaction path.

### State precedence and mapping

The fast path must resolve display precedence in this order:

1. `loading`
2. `error`
3. `empty`
4. `kill_switch`
5. `degraded`
6. `ready`

Interpretation rules:

1. `loading` applies when the branch model or required verification inputs are still resolving.
2. `error` applies when the branch workspace cannot render a trustworthy primary story or verification path.
3. `empty` applies when no branch evidence exists yet and the workspace must prompt the user to import or inspect repo evidence.
4. `kill_switch` is an overlay state that keeps context visible but forces verification emphasis to raw diff.
5. `degraded` is an overlay on an otherwise usable workspace and may not masquerade as a normal success posture.
6. low narrative confidence maps to `ready-low-confidence`, not `error`, unless evidence itself is unavailable or contradictory enough that the primary story cannot be rendered safely.
7. `degraded` and `kill_switch` may be entered either during initial load resolution or after an already-ready workspace loses trust, capture health, or rollout safety.
8. When a runtime trust overlay applies after `ready`, the workspace must immediately recalculate verification posture, collapse any state that overstates confidence, and preserve only currently valid branch-scoped context.

### BranchThesisCard states

1. `loading`
   skeleton headline + skeleton metadata row
2. `ready-high-confidence`
   summary visible, confidence label visible, evidence CTA emphasized
3. `ready-low-confidence`
   summary visible, low-confidence warning visible, raw diff CTA emphasized
4. `failed`
   no narrative claim, direct route to repo evidence and raw diff

### Verification-path states

1. `evidence-first`
   attribution, trace-backed evidence, or validation and test artifacts are strong enough to be the default validating route
2. `session-first`
   session evidence is the best available verifying route
3. `diff-first`
   raw diff is the safest validating route because narrative confidence or trust posture is insufficient

The workspace must expose one of these three validating postures at all times once loading ends.

### CausalSequenceCard states

1. `loading`
   vertical skeleton timeline
2. `ready-with-joins`
   at least one sequence step shows session or trace support
3. `ready-needs-support`
   steps visible but one or more steps are flagged as needing stronger proof
4. `empty`
   no indexed sequence; prompt to import sessions or inspect repo evidence

### Failure and recovery overlays

The branch fast path must distinguish between interpretation weakness and workspace failure.

1. `narrative_low_confidence`
   branch story remains visible, but direct evidence or raw diff becomes the primary action
2. `verification_content_thin`
   evidence rail lacks strong attribution or session support and must say so directly
3. `trust_degraded`
   trust card becomes visually prominent and routes the user toward hygiene or repo evidence
4. `kill_switch_forced_diff`
   story remains readable, but detail-level switching cannot override raw-diff dominance
5. `stale_branch_context`
   user-visible interpretation or verification UI may not survive a branch-scope change unless revalidated against the new branch context

### EvidenceRail states

1. `default`
   trust card + preview evidence + next step
2. `limited`
   trust card + explicit shortage messaging + raw diff route
3. `degraded`
   warning tone + hygiene/repo evidence routes
4. `kill_switch`
   trust card remains visible, but evidence preview deprioritizes interpretation and promotes raw diff
5. `stale`
   previously selected verification content is no longer valid for the active branch scope and must be replaced automatically

### AdvancedAnalysisSection states

1. `collapsed`
   default on first load
2. `expanded`
   user intentionally opened deeper analysis

## Design Tokens

This refactor must prefer existing app semantic tokens over introducing a new brand layer.

### Color system

Use the existing semantic token family already present in the app:

1. surfaces:
   - `bg-bg-primary`
   - `bg-bg-secondary`
   - `bg-bg-tertiary`
2. borders:
   - `border-border-light`
   - `border-border-subtle`
3. accents:
   - `accent-blue`
   - `accent-green`
   - `accent-amber`
   - `accent-red`
4. text:
   - `text-text-primary`
   - `text-text-secondary`
   - `text-text-tertiary`
   - `text-text-muted`

### Visual hierarchy rules

1. The branch thesis card is the only hero-weight surface in the branch workspace.
2. Secondary cards must not compete with the branch thesis through equal headline size or equal saturation.
3. Trust state colors communicate posture, not decoration.
4. There must be one dominant CTA style and one secondary ghost CTA style.

### Typography rules

1. Each card gets one clear title and one supporting sentence block.
2. Metadata and authority labels use smaller mono or uppercase-eyebrow treatment.
3. No section may show more than two simultaneous heading levels.

### Spacing rules

1. Use larger vertical rhythm in the left story rail than in the advanced analysis section.
2. Evidence preview cards may be denser than story cards, but must still preserve scanability.
3. Desktop primary story must avoid more than 5 default-visible cards above the fold.

### Motion rules

1. Use subtle opacity/translate entrance transitions only.
2. Avoid making the verification rail animate independently from the story rail unless the user explicitly changes focus.
3. Reduced-motion users must get the same information hierarchy without delayed reveal.

## Interaction Flows

### Flow 1: First branch read

1. User opens `repo` mode.
2. Workspace header shows branch identity and trust posture.
3. `BranchThesisCard` states the best current claim.
4. `WhyWeBelieveThisCard` explains the evidence mix in one compact block.
5. `CausalSequenceCard` shows ordered steps with authority cues.
6. `EvidenceRail` shows how to verify the claim.
7. `RawDiffAccessCard` offers a lower continuation route into diff detail.
8. User either opens evidence or raw diff from the canonical header CTA group or from the continuation cards.

### Flow 2: Low-confidence narrative

1. User opens a branch with limited joins or weak evidence.
2. Branch thesis is still visible, but low-confidence posture is explicit.
3. Primary CTA shifts to raw diff or direct evidence inspection.
4. Advanced analysis stays collapsed by default.
5. User is never required to interpret `Ask Why` or projection controls before seeing the fallback.

### Flow 3: Trust degradation

1. Capture or app-server posture degrades, whether during initial load or after the workspace was already `ready`.
2. Trust card becomes visually prominent in the evidence rail.
3. Verification posture recalculates and may shift to `diff-first`.
4. Narrative interpretation becomes visually subordinate and any confidence-amplifying local state must step back.
5. Verification next step routes the user toward hygiene or repo evidence instead of optimistic summary interaction.

### Flow 4: Deeper explanation

1. User intentionally expands advanced analysis.
2. `Ask Why`, archaeology, governance, and feedback controls become available.
3. These controls inherit the current trust posture and must never appear more authoritative than the primary evidence.

### Flow 5: File-level follow-through

1. User verifies the branch story.
2. User scrolls into file-level changes and raw diff access.
3. File-level evidence must feel like continuation of the same reading model, not a separate tool mode.

### Flow 6: Branch-scope change

1. User switches branch context, clears a drill-down, or lands on a different filtered branch state.
2. The workspace resets interpretation-local UI state that is no longer trustworthy:
   - advanced analysis collapses
   - evidence rail reselects its verification-priority default
   - stale `Ask Why` content disappears
   - `detailLevel` resets to `summary`
   - staged reveal timers and animation state cancel and restart against the new `branchScopeKey`
3. The branch thesis and evidence rail may only reappear in `ready` form after the new branch scope resolves.
4. No prior branch action label, selected evidence item, selected file, queued deep-link action, or diff expansion may persist if it now points at the wrong branch scope.

### Flow 7: Evidence-rail default resolution

1. The workspace resolves verification posture after narrative and supporting evidence finish loading.
2. If attribution-backed, trace-backed, or validation-backed evidence exists, the evidence rail opens in `evidence-first`.
3. If direct validating evidence is missing but session evidence exists, the evidence rail opens in `session-first`.
4. If neither direct evidence nor session evidence can safely support the claim, the rail opens in `diff-first`.
5. Low-confidence and kill-switch conditions may upgrade the default from `evidence-first` or `session-first` to `diff-first`.

## Accessibility Requirements

1. The workspace must preserve a single logical reading order:
   - header strip
   - thesis
   - why we believe this
   - causal sequence
   - evidence rail
   - raw diff access
   - advanced analysis
2. The default visible experience must remain fully understandable via keyboard and screen reader without opening advanced analysis.
3. The main CTA group must be reachable before lower-priority feedback controls.
4. Trust and authority cues may not be color-only; each requires visible text labels.
5. Advanced analysis disclosure must expose correct expanded/collapsed semantics.
6. Any tab behavior retained inside the evidence rail must follow APG tab semantics and keep inactive content hidden from the accessibility tree.
7. Raw diff access must remain possible without pointer hover or gesture-only interaction.
8. Loading, degraded, empty, and kill-switch states must each expose distinct screen-reader-readable messaging.

## Responsive Behaviour

### Desktop

1. Primary story and evidence rail render side by side.
2. Branch thesis and first 3-4 sequence items should remain visible without requiring a long scroll.
3. Advanced analysis stays below the main canvas.

### Tablet

1. Story rail renders first.
2. Evidence rail stacks directly below sequence.
3. CTA group remains near the top of the viewport.

### Mobile

1. Header strip becomes a stacked card.
2. Branch thesis remains first.
3. Sequence follows immediately after thesis.
4. Evidence rail becomes a linear stack.
5. Advanced analysis remains collapsed by default.
6. No horizontal scrolling is allowed for primary comprehension surfaces.

## Telemetry Contract and UX Success Metrics

The UI refactor must emit or enable measurement for the following user-visible fast-path events. This table is the binding telemetry contract for `VAC` and `UAC` coverage.

| Event | Trigger | Required payload | Owner | Reuse or new |
| --- | --- | --- | --- | --- |
| `branch_fast_path_loaded` | first stable render of the fast-path workspace after loading completes | `branchScopeKey`, `workspaceState`, `trustPosture`, `verificationMode`, `hasAdvancedAnalysis`, `fixtureClass` | `useBranchViewController` | new |
| `branch_primary_cta_used` | user activates the header CTA group | `branchScopeKey`, `cta` (`inspect-evidence` or `open-raw-diff`), `workspaceState`, `verificationMode` | `WorkspaceHeaderStrip` via controller callback | new |
| `branch_advanced_analysis_opened` | advanced section expands | `branchScopeKey`, `workspaceState`, `verificationMode`, `initialOpen` | `useBranchViewController` | new |
| `branch_low_confidence_fallback_used` | a low-confidence or degraded branch routes the user into direct evidence or raw diff | `branchScopeKey`, `workspaceState`, `trustPosture`, `target` | `useBranchViewController` | reuse existing fallback signal where available, else new wrapper |
| `branch_evidence_open_time_ms` | first evidence-open action completes | `branchScopeKey`, `verificationMode`, `elapsedMs`, `source` | `useBranchViewController` | new derived timing metric |
| `branch_story_to_diff_time_ms` | first raw-diff open action completes | `branchScopeKey`, `workspaceState`, `elapsedMs`, `source` | `useBranchViewController` | new derived timing metric |
| `branch_verification_mode_selected` | initial verification posture resolves | `branchScopeKey`, `verificationMode`, `reason` (`attribution`, `validation`, `session`, `fallback`, `kill-switch`, `low-confidence`) | `useBranchViewController` | new |
| `branch_scope_reset_occurred` | branch-scope reset clears stale interpretation state | `oldBranchScopeKey`, `newBranchScopeKey`, `clearedStateKeys`, `staleAsyncDropped` | `useBranchViewController` | new |
| `branch_advanced_control_used` | any advanced-only control is used after disclosure | `branchScopeKey`, `control`, `workspaceState`, `verificationMode` | owning child hook via controller bridge | new |

### Instrumentation guardrails

1. The UI should reuse existing narrative observability counters where they already map to the new flow:
   - layer switched
   - evidence opened
   - fallback used
   - kill switch triggered
2. New metrics must describe user-visible branch fast-path behavior, not internal implementation details.
3. Time-based metrics must measure from fast-path render, not app launch.
4. Telemetry may not treat advanced-analysis usage as a failure by default; it is a diagnostic signal, not an anti-goal.
5. Every telemetry event in this contract must be proven by either a targeted automated assertion or a captured evidence-artifact excerpt, and timing events must include at least one recorded before or after sample.

### Baseline capture contract

Before implementation comparison begins, the team must capture a baseline for the current branch workspace using the same fixture classes later used for sign-off:

1. high-confidence branch
2. low-confidence branch
3. degraded or kill-switch branch
4. branch-scope change sequence `A -> B -> A`

The baseline capture must record:

1. which event names already exist and can be reused
2. which payload fields are missing and must be added
3. the current time-to-first-evidence and time-to-first-diff methodology
4. the file or artifact path where before-and-after comparisons will be stored

### UX success targets

1. Most first-pass branch reads should reach evidence or raw diff without opening advanced analysis.
2. Low-confidence branches should drive higher raw-diff usage than high-confidence branches.
3. Time-to-first-verification action should decrease relative to the current branch workspace baseline.
4. Branch-scope changes should not preserve stale interpretation UI in a way that could mislead the user about what branch is active.

## Visual Acceptance Criteria

### Default and hierarchy

- `VAC1` The default branch workspace renders the canonical top-to-bottom reading order: `WorkspaceHeaderStrip`, `BranchThesisCard`, `WhyWeBelieveThisCard`, `CausalSequenceCard`, `EvidenceRail`, `RawDiffAccessCard`, `AdvancedAnalysisSection`.
- `VAC2` The branch thesis is the most visually prominent card in the workspace and no secondary card matches its heading weight or emphasis.
- `VAC3` The evidence rail reads as one coherent verification column, not as a detached or hidden control area.

### Trust and fallback

- `VAC4` Trust posture is visible in the default viewport on desktop and before advanced analysis on mobile.
- `VAC5` Low-confidence or degraded states visibly reduce narrative authority and promote direct evidence or raw diff actions.
- `VAC6` Kill-switch state makes raw diff the dominant action without removing context about why narrative layers stepped back.

### Interaction and comprehension

- `VAC7` `Ask Why`, audience switching, feedback-role switching, and highlight-voting controls are absent from the default first-pass reading area and appear only in advanced analysis.
- `VAC8` A user can reach a validating evidence action from the default workspace without switching tabs or opening hidden drawers.
- `VAC9` The sequence surface uses authority labels and support states consistently across joined, review-needed, empty, and degraded cases.

### Responsive and accessibility

- `VAC10` Desktop, tablet, and mobile layouts preserve the same reading order and do not introduce horizontal scroll in primary comprehension surfaces.
- `VAC11` Keyboard focus order follows the visual reading order and reaches primary verification actions before advanced controls.
- `VAC12` Loading, empty, error, degraded, and kill-switch states are visually distinct and screen-reader distinguishable.
- `VAC13` On branch-scope change, advanced analysis collapses and any stale evidence or `Ask Why` state is cleared before the new branch fast path resolves.
- `VAC14` The evidence rail selects its default verification posture by verification priority rather than always defaulting to session content.
- `VAC15` Low-confidence and kill-switch states visibly promote raw diff without removing branch thesis context entirely.
- `VAC16` The verification CTA group remains visible and actionable before file-level detail on desktop, tablet, and mobile.

## Out of Scope

1. Rewriting branch narrative heuristics or calibration logic.
2. Changing the six-lane shell contract.
3. Replacing repo indexing, session joining, trace ingestion, or Tauri command boundaries.
4. Redesigning the landing page or standalone marketing site.
5. Removing advanced analysis capabilities; this spec only changes their placement and priority.

## Decision Log

1. The branch workspace remains inside `repo` mode and does not introduce a new top-level route.
2. The refactor uses `dedicated-ui-spec` mode because the core ambiguity is presentation, hierarchy, responsive behavior, and visual correctness.
3. `CausalTimelineView` is the primary visual reference for the new branch experience because it already expresses chronology and authority more clearly than the current branch summary surface.
4. Advanced controls remain in product scope, but they are not part of the default first-pass reading model.
5. The deepening pass preserves the original product intent and strengthens only the sections required to make planning safer: state precedence, verification-path defaulting, reset behavior, telemetry, and `VAC` precision.
6. The evidence rail may keep internal tabs for power users in the first iteration, but they must sit behind a default-visible stacked verification contract and may not override verification-priority defaulting.
7. `BranchSummaryBar` does not survive as an independent first-pass surface; its useful metadata folds into `WorkspaceHeaderStrip`.
8. The causal sequence should be a branch-specific extraction that borrows chronology framing, authority labels, and support-state treatment from `CausalTimelineView` without inheriting that surface wholesale.
9. Low-confidence branch thesis copy must still include a factual commit or file summary when available, even when broader narrative interpretation is suppressed.
10. `CausalTimelineView` is a pattern donor only. The refactor borrows chronology framing and authority treatment, not component lineage by default.
