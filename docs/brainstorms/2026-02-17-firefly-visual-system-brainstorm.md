# Firefly Visual System — Brainstorm (Product-First v1)

> Date: 2026-02-17
> Status: Ready for planning handoff
> Related plans:
> - `/Users/jamiecraik/dev/narrative/docs/plans/2026-02-17-feat-firefly-signal-system-plan.md`
> - `/Users/jamiecraik/dev/narrative/docs/plans/2026-02-17-feat-firefly-signal-system-plan-deepened.md`
> - `/Users/jamiecraik/dev/narrative/docs/plans/2026-02-17-feat-firefly-signal-system-plan-revised.md`

## Table of Contents

- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Key Decisions](#key-decisions)
- [v1 Scope and Non-Goals](#v1-scope-and-non-goals)
- [Recommended Plan Improvements](#recommended-plan-improvements)
- [Open Questions for Planning](#open-questions-for-planning)

## What We're Building

A **Firefly Visual System** where v1 is explicitly a **product signal system** (not mascot illustration). In v1, Firefly is an **abstract ambient orb** in the commit graph that communicates system intelligence with low noise and clear meaning.

Core v1 meaning hierarchy:
1. System is analyzing relevant visible data.
2. Selection/context changed (tracking).
3. A meaningful insight is available for the selected commit.

## Why This Approach

The existing plans are strongest when Firefly behaves as ambient instrumentation. Your newer concept broadens scope to mascot + onboarding + empty-state variants, which is valid long-term, but can blur v1 execution.

A product-first split keeps momentum:
- Ship semantic value in the core workflow first (commit graph).
- Avoid overloading v1 with cross-surface illustration requirements.
- Preserve a clean path to extend into mascot/onboarding/empty-state variants later.

## Key Decisions

1. **Source of truth for v1:** Product-first spec.
2. **v1 surface scope:** Commit graph only.
3. **Primary message:** “System is actively analyzing.”
4. **v1 states:** Idle + Tracking + Analyzing + Insight.
5. **Analyzing trigger:** Only visible, user-relevant analysis.
6. **Insight trigger:** New finding for the currently selected commit becomes visible.
7. **Visual form:** Abstract signal orb (no character form in-product v1).
8. **Deferred from v1:** Onboarding guide variant and empty-state mascot variant.

## v1 Scope and Non-Goals

### In scope
- Semantically clear state transitions for graph-only Firefly.
- Trigger definitions tied to user-visible context.
- Calm, low-distraction visual behavior.

### Out of scope
- Character-like mascot expressions in product runtime.
- Cross-surface visual kit for onboarding/empty states.
- Full illustrative brand system rollout.

## Recommended Plan Improvements

1. **Unify on one canonical plan** (revised version as base) and add this explicit semantic contract.
2. **Rename deliverable framing** from “mascot” to “signal system v1” in implementation docs.
3. **Add acceptance criteria for semantics**, not just animation/perf:
   - Analyzing fires only for in-context analysis.
   - Insight fires only for selected-commit findings.
4. **Create a deferred follow-up brief** for v2 “Firefly Character System” (onboarding + empty states).

## Open Questions for Planning

1. Which concrete app events map to `Analyzing` and `Insight` in current code paths?
2. Should `Insight` auto-return to `Idle` after animation end, or persist until selection changes?
3. What instrumentation will confirm semantic clarity (e.g., event logs, UX check script)?
