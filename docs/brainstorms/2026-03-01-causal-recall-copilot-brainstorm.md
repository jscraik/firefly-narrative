---
date: 2026-03-01
topic: causal-recall-copilot
status: draft
selected_approach: ask-why-answer-card
---

# Causal Recall Copilot Brainstorm

## Table of Contents
- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Approach Options Considered](#approach-options-considered)
- [Key Decisions](#key-decisions)
- [Non-Goals (v1)](#non-goals-v1)
- [Resolved Questions](#resolved-questions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We're Building
A **Causal Recall Copilot** that lets a developer ask a natural-language “why” question (for example, “Why did we change auth retry logic?”) and get a concise, evidence-backed explanation.

v1 focuses on fast context recovery for returning developers. The answer should cite linked evidence from existing local signals (commits, session chunks, traces, tests), include confidence, and keep the user anchored in the current branch narrative workflow.

## Why This Approach
We selected **Approach A: Ask-Why Answer Card** because it delivers the fastest practical value with minimal product risk.

The repo already has reusable primitives for this: narrative composition and confidence handling, recall-lane trust/fallback behavior, Atlas retrieval/session preview, and feedback calibration loops. This means we can add a new “decision-intelligence” experience without introducing new external dependencies or abandoning the local-first posture.

## Approach Options Considered
### A) Ask-Why Answer Card (**selected**)
Single concise answer + evidence citations + confidence/fallback.

### B) Causal Timeline Explorer
Sequence of decision pivots over time; richer but heavier.

### C) Retrieval-Only Why Search
Evidence clusters only; safest but slower to interpret.

## Key Decisions
- **Primary user moment:** Returning developer re-entering context.
- **Answer shape:** 1-paragraph answer + citations.
- **Low-confidence behavior:** Show uncertainty and explicit fallback to evidence/raw diff.
- **Primary success metric:** Faster time-to-understanding.
- **Scope posture:** Local-first, reuse existing repo signals and trust mechanisms.

## Non-Goals (v1)
- No external connector additions.
- No autonomous code changes from answers.
- No heavy timeline/forensics experience in the first release.

## Resolved Questions
1. Which user should v1 optimize first? → Returning developer.
2. What answer format should v1 lead with? → One concise paragraph with citations.
3. What should happen when confidence is low? → Cautious answer + fallback prompt.
4. What is the single north-star metric? → Time-to-understanding improvement.

## Open Questions
- None blocking for planning.

## Next Steps
Proceed to planning with `/prompts:workflow-plan` and use this brainstorm as the WHAT-level source.
