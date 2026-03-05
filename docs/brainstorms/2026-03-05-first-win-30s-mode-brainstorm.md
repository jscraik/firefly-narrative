---
date: 2026-03-05
topic: first-win-30s-mode
---

# First Win in 30s Mode

## Table of Contents
- [What We Are Building](#what-we-are-building)
- [Why This Approach](#why-this-approach)
- [Approaches Considered](#approaches-considered)
- [Key Decisions](#key-decisions)
- [Non-Goals (v1)](#non-goals-v1)
- [Resolved Questions](#resolved-questions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We Are Building
A focused v1 “first win” commit-understanding flow for repo mode that helps a solo AI-heavy developer answer three things in under 30 seconds:
1. What changed
2. Why it changed
3. What evidence supports the explanation

The feature reuses existing Narrative surfaces and data primitives (timeline, narrative highlights, confidence, citations/evidence paths) and avoids net-new major product surfaces in v1.

## Why This Approach
We selected a guided loop because it delivers the fastest user-visible value while staying inside YAGNI boundaries. It directly targets the current value gap (time-to-understanding) without coupling delivery to larger platform refactors.

This keeps v1 execution simple and measurable: reduce comprehension latency first, then use that learning to inform later platform hardening work (for example command-surface governance and deeper backend modularization).

## Approaches Considered
### A) Guided Commit Story Loop (**selected**)
Linear What -> Why -> Evidence sequence inside existing branch/repo UI flow.

### B) Confidence-First Triage
Lead with trust/confidence and branch users into summary/evidence paths.

### C) Story Card + Deep Dive
Single concise summary card with an optional expanded deep-dive path.

## Key Decisions
- Primary user for v1: **solo AI-heavy developer**.
- Primary success metric: **time-to-understand a commit under 30 seconds**.
- Scope constraint: **reuse existing surfaces; no net-new major UI surface in v1**.
- Low-confidence behavior: **show cautious summary + explicit route to evidence/raw diff**.
- Product sequencing: **optimize first-win UX now; defer broader platform initiatives to follow-on planning**.

## Non-Goals (v1)
- No major new information architecture or broad layout redesign.
- No expansion to team/audit-first workflows in this first slice.
- No dependency on codex_app_server modular refactors landing first.
- No net-new core data source requirements; use existing local signals.

## Resolved Questions
- Which top-5 improvement is first? -> **First Win UX**.
- Who is v1 for? -> **Solo AI-heavy developer**.
- Should v1 broaden layout scope? -> **No, existing surfaces only**.
- What is the north-star metric? -> **<30s understanding**.
- How should low-confidence cases behave? -> **Caution + evidence-first fallback**.

## Open Questions
None at this stage.

## Next Steps
-> `/prompts:workflow-plan` to define implementation sequencing, acceptance checks, and validation gates.
