---
date: 2026-02-24
topic: narrative-truth-loop
status: draft
---

# Narrative Truth Loop — Brainstorm

## Table of Contents
- [What We’re Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Approach Options Considered](#approach-options-considered)
- [Key Decisions](#key-decisions)
- [Resolved Questions](#resolved-questions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We’re Building
A **Narrative Truth Loop** that captures explicit human feedback on branch narratives and uses that feedback to improve future narrative quality for the same repository.

The v1 intent is to make Narrative self-correcting while staying low-risk and explainable. Users can mark highlights as “Wrong” or “Key,” and can also report “Missing decision” at branch level. Feedback is then used to improve two outputs over time: (1) highlight ranking quality and (2) narrative confidence calibration.

Scope is intentionally narrow: this is a repo-local quality loop, not a global ML system. The goal is to increase trust in narrative-first workflows so users need to drop to raw diff less often.

## Why This Approach
We selected a **policy + calibration combo** for v1: bounded ranking adjustments plus confidence recalibration. This gives compounding benefit without introducing opaque behavior.

- Ranking improvements help users see better highlights first.
- Confidence improvements make summaries more trustworthy and better aligned with observed quality.
- Bounded policy rules prevent overfitting or unstable shifts.

This approach balances utility and safety: it is more accretive than single-layer tuning, but still simpler and more defensible than a broad adaptive system.

## Approach Options Considered
### A) Rule-weight tuning only
Simple and fast, but limited confidence improvement.

### B) Confidence calibration only
Improves trust signaling, but doesn’t improve ordering enough.

### C) Policy + calibration combo (**chosen**)
Combines ranking and confidence gains with guardrails; best balance for v1.

## Key Decisions
- Primary feedback actors: **both individual developers and team reviewers/managers**.
- v1 feedback impact: **highlight ranking + confidence score**.
- v1 feedback actions: **Wrong / Key (per highlight) + Missing decision (branch-level)**.
- Learning scope: **per-repo memory** (no cross-repo/global learning in v1).
- Primary success signal: **reduction in raw-diff fallback usage after narrative reads**.

## Resolved Questions
1. Who gives feedback? → Both developer and reviewer roles.
2. What changes from feedback? → Ranking and confidence.
3. Which actions in UI? → Wrong, Key, Missing decision.
4. Where does learning persist? → Repo-local.
5. What defines success? → Fewer fallback-to-diff events.

## Open Questions
- None blocking for v1 brainstorm scope.

## Next Steps
Move to planning to define:
- narrative feedback event taxonomy,
- repo-local feedback persistence contract,
- ranking/confidence update policy bounds,
- rollout metrics and guardrails.

→ `/workflows:plan`
