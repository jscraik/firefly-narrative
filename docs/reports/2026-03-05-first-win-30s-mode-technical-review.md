---
title: Technical review — First Win in 30s Mode plan
date: 2026-03-05
plan: /Users/jamiecraik/dev/firefly-narrative/docs/plans/2026-03-05-feat-first-win-30s-mode-plan.md
status: complete
---

# Technical review — First Win in 30s Mode

## Summary
The plan is strong, scoped, and aligned to the origin brainstorm. It is implementable with existing architecture and has clear quality gates.

Top risks to resolve before implementation:
1. KPI event mismatch (`evidence_ready` target vs current mixed usage of `evidence_requested`).
2. Terminal outcome uniqueness is specified, but attempt identity is not fully normalized across What/Why/Evidence events.
3. Telemetry consent-gating can create denominator drift for KPI calculations unless explicitly modeled.

## What is strong
- Clear scope constraints and non-goals carried forward from brainstorm.
- File-scoped implementation checklist reduces execution ambiguity.
- Race/stale handling is explicitly treated as a first-class requirement.
- Existing tests and contracts are correctly referenced for extension.

## Findings

### [P1] Funnel-step contract ambiguity
The KPI is defined as `what_ready -> evidence_ready`, but current event usage includes `evidence_requested` and Ask-Why-specific events. Without one canonical completion event, measurement may be inconsistent across paths.

**Recommendation:** Add a single canonical “first_win_completed” event (or clearly standardize on one existing event name) and require all completion paths to emit it.

### [P1] Attempt identity not fully standardized
The plan requires exactly one terminal outcome per attempt, but does not define one canonical `attempt_id` shared by all related events in the same flow.

**Recommendation:** Introduce and require `attempt_id` derived from repo/branch/selected commit + monotonic request nonce; enforce this in tests.

### [P2] Consent-based telemetry sampling bias
Plan requires consent-aware telemetry. If consent is false, KPI denominators may silently shrink and hide regressions.

**Recommendation:** Define two KPI lanes: (a) telemetry-observed sessions, (b) local UI-observed counters (non-exported), and report both where possible.

### [P2] Expert bypass regression risk
The plan calls this out but does not define explicit regression threshold.

**Recommendation:** Add a hard acceptance threshold (e.g., raw-diff open latency must not increase by >10% from baseline in local tests).

## Recommended deltas to plan
1. Add a “Telemetry Schema Contract” subsection defining canonical completion event + required fields.
2. Add `attempt_id` as a required field in acceptance criteria and tests.
3. Add KPI denominator policy for consent-off sessions.
4. Add explicit expert-bypass latency non-regression criterion.

## Go / No-Go
- **Go with changes:** Yes.
- **Blockers:** None, if P1 findings are addressed before implementation starts.
