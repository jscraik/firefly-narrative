---
date: 2026-03-04
topic: first-win-commit-story-loop
---

# First-Win Commit Story Loop

## Table of Contents
- [What We Are Building](#what-we-are-building)
- [Why This Approach](#why-this-approach)
- [Key Decisions](#key-decisions)
- [Resolved Questions](#resolved-questions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We Are Building
A focused first-win experience for Narrative that helps a solo AI-heavy developer understand a commit in under 20-30 seconds using a simple What -> Why -> Evidence sequence.

This is a UX-and-flow tightening effort using existing surfaces and data (repo timeline, sessions, trace/evidence) rather than introducing new product areas.

## Why This Approach
We considered three options:
1. Guided commit story loop (selected)
2. Progressive disclosure cleanup only
3. Agent-friendly contract-first

**Recommendation: Guided commit story loop**

- **Pros:** strongest immediate user value, directly supports the "<30s understanding" success metric, and stays within existing product surfaces.
- **Cons:** still requires careful orchestration cleanup in overloaded controllers to avoid UX polish living on brittle foundations.
- **Best suited when:** we need a compelling first-win now without introducing major new surface area.

The selected approach gives the strongest user value quickly while staying within YAGNI constraints. It also supports future maintainability work by forcing clearer boundaries around the commit narrative flow.

## Key Decisions
- Primary outcome: first-win UX for new/returning users in repo mode.
- Primary user: solo AI-heavy developer.
- Success metric: time-to-understand-commit (target: <30 seconds for what/why/evidence).
- Scope guardrail: no net-new core surfaces; reshape existing flow.
- Secondary track: reduce orchestration hotspots to keep the experience maintainable.

## Resolved Questions
- Should we optimize for product breadth or immediate clarity? **Immediate clarity**.
- Should we prioritize team/audit personas first? **No, solo AI-heavy dev first**.
- Should we allow broad redesign now? **No, keep scope constrained**.
- Should architecture cleanup be in scope? **Yes, but only as a supporting track**.

## Open Questions
None at this stage.

## Next Steps
-> `/prompts:workflow-plan` to define implementation sequencing, file ownership, and validation gates.
