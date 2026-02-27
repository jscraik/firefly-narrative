---
date: 2026-02-27
topic: recall-lane-comprehension
status: draft
---

# Recall Lane for Faster Personal Context Reuse

## Table of Contents
- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Approach Options Considered](#approach-options-considered)
- [Key Decisions](#key-decisions)
- [Resolved Questions](#resolved-questions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We're Building
Introduce a **Recall Lane** in the summary layer to help personal AI-assisted developers quickly understand: *what changed, why it changed, and how confident the app is in that explanation*.

The lane will surface three things in a compact block before deep-dive layers:
1. The most material branch decisions (prioritized from existing signals).
2. A simple trust marker per item (high/medium/low confidence with rationale).
3. Fast jump points to evidence (sessions, traces, or raw diff).

This directly addresses the two user priorities discovered: summaries that feel uncertain, and difficulty spotting material context change at a glance.

## Why This Approach
The codebase already has core narrative building blocks (`composeBranchNarrative`, `buildDecisionArchaeology`, and `BranchNarrativePanel`) but the current summary surface does not explicitly prioritize “what to understand first.” Recall Lane reuses those outputs instead of introducing a new domain model, so we get usable improvement without adding workflow friction.

It also matches the app's existing trust model: when confidence is low, users already have fallback paths (evidence + raw diff). Recall Lane just makes the first layer clearer and more actionable.

## Approach Options Considered
### Approach A: Improve Existing Narrative Scoring Heuristics
Tune scoring/phrasing in current highlight generation and show confidence more clearly.

**Pros:** Smallest change footprint.
**Cons:** Better text quality alone may still leave “what changed first” ambiguity.

### Approach B: Recall Lane (**selected**)
Add a dedicated summary strip in `summary` mode that orders decisions and shows confidence/evidence at a glance.

**Pros:** Highest impact for fast personal comprehension while preserving fallback safety.
**Cons:** Needs clear noise controls in very low-signal branches.

### Approach C: Decision Journal Timeline
Build a deeper chronological “decision replay” with richer pivot history.

**Pros:** Stronger deep recall for long absences.
**Cons:** Bigger scope and higher UI risk for v1.

## Key Decisions
- **Scope:** Summary-layer first in v1; evidence and raw diff remain existing lower layers.
- **User cost:** No manual inputs required in v1.
- **Trust behavior:** Use current narrative confidence/evidence signals; low-confidence cases should recommend opening raw diff.
- **Priority inputs:** Use existing signals (`session`, `trace`, `test`, `anchor`) for ranking and trust display.
- **Data posture:** Keep local-first sources only; no new external connectors.

## Resolved Questions
1. Should this be inference-only by default? → Yes.
2. Should we optimize both trust clarity and material-change clarity together? → Yes.
3. Should this precede evidence/diff layers? → Yes.

## Open Questions
- None blocking for v1 brainstorm scope.

## Next Steps
Proceed to planning with `/workflows:plan`.
