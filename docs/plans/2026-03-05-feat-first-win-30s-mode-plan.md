---
title: "feat: First Win in 30s Mode"
type: feat
status: completed
date: 2026-03-05
origin: docs/brainstorms/2026-03-05-first-win-30s-mode-brainstorm.md
---

# ✨ feat: First Win in 30s Mode

## Table of Contents
- [Section Manifest](#section-manifest)
- [Overview](#overview)
- [Brainstorm Carry-Forward](#brainstorm-carry-forward)
- [Research Summary](#research-summary)
- [Problem Statement](#problem-statement)
- [Proposed Solution](#proposed-solution)
- [Technical Approach](#technical-approach)
  - [Architecture](#architecture)
  - [Execution Contract](#execution-contract)
  - [Implementation Phases](#implementation-phases)
- [Alternative Approaches Considered](#alternative-approaches-considered)
- [SpecFlow Analysis](#specflow-analysis)
- [System-Wide Impact](#system-wide-impact)
  - [Interaction Graph](#interaction-graph)
  - [Error & Failure Propagation](#error--failure-propagation)
  - [State Lifecycle Risks](#state-lifecycle-risks)
  - [API Surface Parity](#api-surface-parity)
  - [Integration Test Scenarios](#integration-test-scenarios)
- [Acceptance Criteria](#acceptance-criteria)
  - [Functional Requirements](#functional-requirements)
  - [Non-Functional Requirements](#non-functional-requirements)
  - [Quality Gates](#quality-gates)
- [Success Metrics](#success-metrics)
- [Dependencies & Prerequisites](#dependencies--prerequisites)
- [Risk Analysis & Mitigation](#risk-analysis--mitigation)
- [Documentation Plan](#documentation-plan)
- [Implementation Checklist (File-Scoped)](#implementation-checklist-file-scoped)
- [Sources & References](#sources--references)

## Section Manifest
- **Overview / Problem**: clarify the first-win comprehension gap and why this should ship now.
- **Proposed Solution**: codify the What → Why → Evidence flow as a deterministic contract.
- **Technical Approach**: detail boundaries, sequencing, and measurable phase exits.
- **SpecFlow**: ensure user-flow completeness and edge-case coverage.
- **System-Wide Impact**: trace cross-layer effects and failure semantics.
- **Acceptance / Metrics**: define explicit, testable completion criteria.

## Overview
Deliver a focused repo-mode first-win experience that helps a solo AI-heavy developer explain one commit in under 30 seconds using a guided **What → Why → Evidence** sequence (see brainstorm: `docs/brainstorms/2026-03-05-first-win-30s-mode-brainstorm.md`).

This is a refinement-first feature: no major new surfaces, no broad redesign, and no dependency on backend modularization landing first (see brainstorm: Non-Goals).

## Brainstorm Carry-Forward
Origin document: `docs/brainstorms/2026-03-05-first-win-30s-mode-brainstorm.md`.

Carried-forward decisions:
1. Primary persona: solo AI-heavy developer (see brainstorm: Key Decisions).
2. North-star metric: <30s time-to-understand-commit (see brainstorm: Key Decisions).
3. Scope guardrail: reuse existing surfaces only (see brainstorm: Key Decisions + Non-Goals).
4. Low-confidence behavior: caution + explicit evidence/raw-diff route (see brainstorm: Key Decisions).
5. Sequencing: UX first, broader hardening later (see brainstorm: Key Decisions).

Open questions from brainstorm: **none**.

## Research Summary
### Local repo research
Core patterns already exist and can be hardened rather than replaced:
- Telemetry includes commit-scoped start anchor (`what_ready`) and funnel fields in `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchTelemetry.ts:111-155`.
- Ask-Why stale/race handling uses monotonic versioning and stale terminal outcomes in `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchAskWhyState.ts:18-166`.
- Evidence + fallback behavior is centralized in `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchViewController.ts:420-487`.
- Narrative low-confidence fallback copy exists in `/Users/jamiecraik/dev/firefly-narrative/src/core/narrative/composeBranchNarrative.ts:199-212`.
- Existing tests already cover portions of this contract:
  - `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/__tests__/BranchView.test.tsx:857-933`
  - `/Users/jamiecraik/dev/firefly-narrative/src/core/telemetry/__tests__/narrativeTelemetry.test.ts:13-117`

### Institutional learnings
Applied from `/Users/jamiecraik/dev/firefly-narrative/docs/solutions/integration-issues/codex-app-server-claude-otel-stream-reliability-auth-migration-hardening.md`:
- deterministic precedence beats ambiguous state transitions,
- explicit fallback states reduce silent failure,
- phase gates with measurable thresholds prevent “looks good” drift.

### Research execution note
Required research/specflow subagents were attempted but blocked by runtime model quota (`GPT-5.3-Codex-Spark`). Manual local equivalent analysis was performed and captured here.

### External research decision
Skipped: this is a low-risk in-repo UX/flow refinement with strong local patterns and tests.

## Problem Statement
The first-win loop is present but not consistently perceived as a single, guided path.

Current pain points:
- Users can reach evidence/fallback paths, but progression cues are split across components.
- Low-confidence states are available, but first action is not always obvious.
- Async race protection exists, but contract-level “one terminal outcome per attempt” is not yet enforced as an explicit feature invariant.

## Proposed Solution
Codify a first-win execution contract on existing surfaces:
1. **What** starts at commit selection with a deterministic `what_ready` anchor.
2. **Why** returns concise answer + confidence/fallback semantics.
3. **Evidence** always resolves to evidence-open or explicit raw-diff fallback.
4. Each attempt emits exactly one terminal outcome (`success|fallback|failed|stale_ignored`).

No new major surface area is introduced (see brainstorm: scope constraint).

## Technical Approach
### Architecture
Reuse existing modules and tighten contracts:
- Flow orchestration: `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchViewController.ts`
- Why state/race guards: `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchAskWhyState.ts`
- Telemetry contract: `/Users/jamiecraik/dev/firefly-narrative/src/core/telemetry/narrativeTelemetry.ts`
- Narrative confidence/fallback: `/Users/jamiecraik/dev/firefly-narrative/src/core/narrative/composeBranchNarrative.ts`
- User interaction surface: `/Users/jamiecraik/dev/firefly-narrative/src/ui/components/BranchNarrativePanel.tsx`

### Execution Contract
- **Start condition**: selected commit has emitted `what_ready`.
- **Why condition**: ask-why answer emits `success|fallback|failed|stale_ignored`.
- **Evidence condition**: evidence interaction emits `success` if opened, `fallback` if routed to raw diff.
- **Completion condition**: first-win attempt reaches one terminal outcome exactly once and emits canonical completion telemetry.
- **Stale policy**: stale responses never mutate visible state and must emit `stale_ignored`.
- **Attempt identity**: every first-win flow event includes shared `attempt_id` (repo + branch + selected commit + monotonic nonce).
- **Canonical completion event**: define one completion event (`first_win_completed`) or canonical equivalent and require all successful/fallback paths to emit it.

### Implementation Phases
#### Phase 1 — Contract alignment (flow + affordances)
- Tighten Summary cues and action ordering in `BranchNarrativePanel.tsx`.
- Normalize evidence/open fallback semantics in `useBranchViewController.ts`.
- Ensure low-confidence route is explicit and consistent with brainstorm decision.

Exit criteria:
- deterministic What → Why → Evidence progression in existing surface,
- no hidden or ambiguous fallback behavior.

#### Phase 2 — Contract enforcement (telemetry + stale handling)
- Enforce one-terminal-outcome-per-attempt checks in telemetry helpers/tests.
- Enforce required `attempt_id` presence/shape across What/Why/Evidence events.
- Enforce canonical completion event emission for all completion paths.
- Harden branch/file switch stale behavior under rapid interaction.
- Ensure funnel step labels are stable and comparable.

Exit criteria:
- terminal outcome invariants proven in tests,
- stale paths reliably non-mutating.

#### Phase 3 — Measurement and release hardening
- Add explicit KPI assertions/reports for first-win path latency.
- Validate no regression for expert one-click raw diff access.
- Prepare rollout and watch-window notes.

Exit criteria:
- p95 KPI measurable and reportable,
- no expert-flow regression.

## Alternative Approaches Considered
1. **Guided loop (selected)**: highest immediate user value, lowest surface risk (see brainstorm: Why This Approach).
2. **Confidence-first triage (deferred)**: strong trust framing, but slower to first answer for v1.
3. **New story card surface (deferred)**: cleaner onboarding but violates “reuse existing surfaces” constraint in v1.

## SpecFlow Analysis
Manual specflow-equivalent review identified required coverage:

Primary path:
1. Commit selected (What)
2. Why requested and resolved
3. Evidence opened or fallback to raw diff
4. Terminal outcome recorded

Edge cases:
- branch switch during in-flight Why request,
- A→B→A selection churn,
- diff-only evidence links,
- `needs_attention` with no rich evidence,
- repeated rapid clicks creating duplicate terminal events.

SpecFlow-driven additions:
- require “exactly one terminal outcome per attempt” acceptance criterion,
- add explicit integration tests for stale and duplicate-terminal suppression.

## System-Wide Impact
### Interaction Graph
`BranchViewController` action → `useBranchTelemetry` + `useBranchAskWhyState` → `narrativeTelemetry` event contract → UI state update and/or fallback route.

### Error & Failure Propagation
- Ask-Why failures map to `failed` and actionable error UI.
- Stale async completions map to `stale_ignored` with no state mutation.
- Evidence failures map to `fallback` and preserve progress.

### State Lifecycle Risks
- stale updates after scope change,
- duplicate terminal event emission,
- low-confidence state ambiguity.

Mitigations:
- monotonic request identity + scope guards,
- terminal outcome dedupe,
- mandatory fallback affordance on low-confidence states.

### API Surface Parity
No new external APIs. Parity needed across:
- narrative events,
- ask-why events,
- evidence/fallback action emitters,
- branch-view handlers and tests.

### Integration Test Scenarios
1. Ask-Why then branch switch before resolve → stale ignored, no UI mutation.
2. Evidence link with `diff` kind → deterministic fallback path + telemetry fallback outcome.
3. Low-confidence narrative path → user gets explicit evidence/raw-diff CTA.
4. Rapid repeat evidence clicks → no duplicate terminal outcome for one attempt key.
5. Expert bypass from summary → one-click raw diff still works.

## Acceptance Criteria
### Functional Requirements
- [x] Existing summary surface in `/Users/jamiecraik/dev/firefly-narrative/src/ui/components/BranchNarrativePanel.tsx` clearly guides What → Why → Evidence with no net-new major surface (see brainstorm: scope).
- [x] Low-confidence narrative states always present explicit evidence/raw-diff fallback (see brainstorm: low-confidence decision).
- [x] Expert users can open raw diff directly without extra intermediate friction.

### Non-Functional Requirements
- [x] First-win path remains deterministic under branch/file churn.
- [x] Telemetry data remains consent-gated and branch scope remains pseudonymized.
- [x] KPI denominator policy is explicit for consent-off sessions (telemetry-observed lane vs local UI-observed lane).
- [x] No new persistence model is required (ERD unchanged for v1).

### Quality Gates
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm test:deep` (required because runtime behavior is affected)
- [x] Branch-view + telemetry tests include stale/fallback/terminal-outcome invariants.
- [x] Branch-view + telemetry tests enforce `attempt_id` and canonical completion event contract.
- [x] Expert raw-diff bypass latency shows no >10% regression versus baseline.
  - Validation run (focused test): baseline `35.807ms` → current `33.927ms` (`-5.25%`, within threshold).

## Success Metrics
Primary (from brainstorm):
- **p95 (`what_ready` → `evidence_ready`) <= 30 seconds**.

Secondary:
- stale-ignore behavior remains controlled under rapid interaction,
- fallback events represent explicit route choices, not silent failures,
- no measurable regression in raw-diff bypass usage latency,
- KPI reporting includes both telemetry-observed and local UI-observed lanes where available.

## Dependencies & Prerequisites
- Existing first-win telemetry scaffolding (`narrativeTelemetry.ts`, `useBranchTelemetry.ts`).
- Existing race-guard implementation in `useBranchAskWhyState.ts`.
- Existing branch/evidence tests for extension rather than greenfield test harness.

## Risk Analysis & Mitigation
- **Risk:** UX guidance changes degrade expert flow.
  - **Mitigation:** preserve one-click raw-diff path and test it.
- **Risk:** event-contract drift across modules.
  - **Mitigation:** add contract-focused assertions in telemetry + branch-view tests.
- **Risk:** controller complexity causes regressions.
  - **Mitigation:** keep file-scoped, contract-first changes; avoid broad refactors in this slice.

## Documentation Plan
- Update `/Users/jamiecraik/dev/firefly-narrative/docs/agents/testing.md` only if test workflow changes.
- Update `/Users/jamiecraik/dev/firefly-narrative/README.md` only if user-visible behavior/copy changes materially.
- Keep origin linkage and carried-forward decisions visible in plan and PR summary.

## Implementation Checklist (File-Scoped)
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/ui/components/BranchNarrativePanel.tsx` — tighten first-win action ordering and low-confidence CTA clarity.
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchViewController.ts` — enforce deterministic evidence/fallback terminal outcomes.
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchAskWhyState.ts` — preserve stale guards and ensure terminal outcomes remain explicit.
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchTelemetry.ts` — verify funnel-step ordering and completion anchors.
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/core/telemetry/narrativeTelemetry.ts` — keep payload validation, required `attempt_id`, and canonical completion event contract alignment.
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/__tests__/BranchView.test.tsx` — add/update integration tests for stale + fallback + expert bypass.
- [x] `/Users/jamiecraik/dev/firefly-narrative/src/core/telemetry/__tests__/narrativeTelemetry.test.ts` — strengthen contract assertions for funnel steps/outcomes.

## Sources & References
### Origin
- Brainstorm: `/Users/jamiecraik/dev/firefly-narrative/docs/brainstorms/2026-03-05-first-win-30s-mode-brainstorm.md`

### Internal references
- `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchTelemetry.ts:111-155`
- `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchAskWhyState.ts:18-166`
- `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/branch-view/useBranchViewController.ts:420-487`
- `/Users/jamiecraik/dev/firefly-narrative/src/core/narrative/composeBranchNarrative.ts:199-212`
- `/Users/jamiecraik/dev/firefly-narrative/src/ui/components/BranchNarrativePanel.tsx:144-360`
- `/Users/jamiecraik/dev/firefly-narrative/src/ui/views/__tests__/BranchView.test.tsx:857-933`
- `/Users/jamiecraik/dev/firefly-narrative/src/core/telemetry/__tests__/narrativeTelemetry.test.ts:13-117`

### Institutional learning
- `/Users/jamiecraik/dev/firefly-narrative/docs/solutions/integration-issues/codex-app-server-claude-otel-stream-reliability-auth-migration-hardening.md`

### Related work
- `/Users/jamiecraik/dev/firefly-narrative/docs/plans/2026-03-04-feat-first-win-commit-story-loop-plan.md`
