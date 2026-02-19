---
date: 2026-02-18
topic: trace-quality-hardening
---

# Trace Quality Hardening Brainstorm

## Table of Contents
- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Key Decisions](#key-decisions)
- [Locked Decisions for Planning (Do Not Re-open)](#locked-decisions-for-planning-do-not-re-open)
- [Metric Definitions (P0)](#metric-definitions-p0)
- [Scope Boundaries (P0)](#scope-boundaries-p0)
- [Acceptance Semantics for Trust Signals (P0)](#acceptance-semantics-for-trust-signals-p0)
- [Risks and Triggers](#risks-and-triggers)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We're Building
We are improving Narrative's trace observability quality so traces from Codex and Claude are reliably captured, normalized, linked, and reviewable as a trustworthy source of truth for agent behavior.

This is a quality-hardening effort, not a broad platform expansion. The goal is to increase coverage correctness, make dropped/partial traces visible, and enforce linkage-quality checks so attribution can be trusted during debugging and analysis.

## Why This Approach
We considered broader consolidation and platform-expansion options, but selected a YAGNI-first path that directly addresses current trust gaps with measurable outcomes.

This path answers the immediate question ("is this effective and correct?") while preserving optionality for later architecture changes.

## Key Decisions
- **Approach selected (Approach 1):** Quality-first hardening of the current pipeline (not a full re-architecture).
- **P0 success priority:** Coverage correctness is the top outcome.
- **Acceptance bar:** Pragmatic thresholds (>=95% ingest, >=90% linkage, visible drops).
- **P0 scope:** Parser completeness + drop visibility + linkage QA.
- **Data-source coverage:** Codex and Claude trace/log streams via the current OTel collection pipeline (including `~/.codex/otel-collector`).

## Locked Decisions for Planning (Do Not Re-open)
- Approach remains quality-first hardening of the current pipeline (no re-architecture in P0).
- P0 acceptance thresholds are locked:
  - Trace ingest success rate >= 95%
  - Attribution linkage success rate >= 90%
  - Drops/partials must be explicitly visible (no silent failures)
- P0 scope remains parser completeness, drop/partial visibility, and linkage QA.

## Metric Definitions (P0)
- **Trace ingest success rate** = successful normalized ingests / total ingest attempts.
- **Attribution linkage success rate** = traces with valid attribution linkage / traces eligible for linkage.
- **Measurement window** = rolling 7-day window, reported daily.
- **Pass condition** = global thresholds must pass; per-source (Codex/Claude) results are reported to prevent aggregate masking.
- **Durability condition** = thresholds hold for two consecutive reporting windows.

## Scope Boundaries (P0)
### In Scope
- Parser completeness hardening for current Codex/Claude sources.
- Visibility surfaces for dropped/partial traces.
- Linkage-quality validation and reporting.

### Out of Scope
- New agent providers/sources beyond current Codex/Claude paths.
- Full pipeline re-architecture or migration.
- New feature expansion unrelated to trace quality hardening.

## Acceptance Semantics for Trust Signals (P0)
- Any dropped/partial trace must surface a degraded state in review surfaces.
- “High trust” attribution signals are allowed only when:
  1) trace is fully ingested,
  2) linkage passes QA checks,
  3) no partial/drop flags are present.
- Default review SLA target for surfaced drops/partials: next business day.

## Risks and Triggers
- **Primary risk:** false confidence from global pass while one source degrades.
- **Trigger:** any source misses threshold in a reporting window.
- **Response direction:** treat as quality regression and prioritize remediation before broadening scope.

## Open Questions
- **Q1:** Should fixed thresholds be displayed as global headline + per-source breakdown in all views?
  - **Owner:** TBD
  - **Decision date:** before `/prompts:workflows-plan` execution
  - **Decision rule:** choose the option that best prevents source-level masking.
- **Q2:** Is next-business-day SLA for drops/partials sufficient for early rollout?
  - **Owner:** TBD
  - **Decision date:** during planning
  - **Decision rule:** align with realistic team response capacity.
- **Q3:** Which confidence states should automatically suppress “high trust” UI?
  - **Owner:** TBD
  - **Decision date:** during planning
  - **Decision rule:** prefer conservative suppression over false positives.

## Next Steps
→ Run `/prompts:workflows-plan` to produce sequencing, ownership, validation matrix, and rollout controls using these locked decisions.
