---
date: 2026-02-19
topic: hybrid-capture-reliability
---

# Hybrid Capture Reliability Brainstorm

## Table of Contents
- [What](#what)
- [Why](#why)
- [Approaches Considered](#approaches-considered)
- [Key Decisions](#key-decisions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What
Ship a reliability-first v1 for dependable capture in Codex and Claude now, while preserving a foundation for longer-term multi-tool coverage.

The v1 outcome is **consistent session capture and replayability**. Captured sessions should be reliably ingested, linked, and visible with minimal setup friction. Scope remains intentionally narrow: establish a shared collector path, support migration from the legacy path, and add one targeted real-time boost where it most improves user value.

Out of scope for v1: new provider adapters beyond Codex/Claude, full cross-provider real-time parity, and unrelated feature expansion.

## Why
We selected a balanced path between under-scoped (OTEL-only) and over-ambitious (full multi-protocol real-time) alternatives.

This keeps YAGNI discipline by prioritizing reliability outcomes first, while still creating the shared foundation needed for future adapters. Decision criteria priority: (1) capture reliability under degraded conditions, (2) setup friction for existing users, (3) extensibility without committing to additional v1 adapters.

## Approaches Considered
### Approach A: OTEL Baseline Only
Use only shared OTEL collection for Codex + Claude.

**Pros:** simple rollout, lowest integration risk.  
**Cons:** misses near-real-time Codex visibility.

### Approach B: Hybrid Reliability-First (**Selected**)
Use shared OTEL baseline for Codex + Claude, plus Codex App Server streaming for near-real-time Codex visibility.

**Pros:** strongest reliability/visibility trade-off; scoped complexity.  
**Cons:** requires coordinating dual Codex ingestion paths.

### Approach C: Full Real-Time Multi-Protocol
Codex App Server + Claude MCP + OTEL fallback from day one.

**Pros:** most comprehensive real-time vision.  
**Cons:** highest delivery risk for v1 reliability objective.

## Key Decisions
- **Primary objective:** v1 success is reliable capture (not broad feature expansion).
- **Scope posture:** balanced universal strategy (shared foundation now, broader adapters later).
- **Collector canonical path:** `~/.agents/otel/collector`.
- **Legacy path handling:** guided migration wizard with one-click move from `~/.codex/otel-collector`.
- **Required v1 ingestion channels:** hybrid model:
  - Codex + Claude via OTEL baseline
  - Codex App Server streaming in addition to OTEL
- **Codex auth posture:** OpenAI/Auth0 login flow for Codex App Server (not API-key-first).
- **Auth outage behavior:** Codex capture falls back to OTEL-only temporarily.
- **v1 non-goal:** no requirement to deliver full multi-agent real-time parity in this release.

## Open Questions
- Should fallback state messaging explicitly label "streaming unavailable, OTEL capture active" in UI trust indicators?
- Should first-run messaging explicitly state that OpenAI/Auth0 login enables Codex App Server streaming while OTEL baseline capture remains active?
- Should migration wizard be mandatory on first run when legacy path is detected, or dismissible with reminders?
- What explicit release gate defines "reliable capture" (capture continuity, linkage completeness, replayability consistency) so v1 can be accepted or delayed?
- What product-level precedence rule should apply when OTEL and Codex App Server data overlap or conflict so users always see one deterministic narrative?

## Next Steps
Run `/prompts:workflows-plan` to define implementation sequencing, validation checks, and rollout gates for the selected approach.
