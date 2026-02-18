---
date: 2026-02-18
topic: trace-quality-hardening
---

# Trace Quality Hardening Brainstorm

## Table of Contents
- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Key Decisions](#key-decisions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We're Building
We are improving Narrative's trace observability quality so traces from Codex and Claude are reliably captured, normalized, linked, and reviewable as a trustworthy source of truth for agent behavior.

The focus is not adding broad new platform scope. The goal is quality hardening of existing trace-first capabilities: ensure high coverage correctness, make dropped/partial traces visible, and enforce linkage quality checks so attribution can be trusted in day-to-day debugging and analysis.

P0 success is defined with pragmatic acceptance targets: at least 95% trace ingest success, at least 90% attribution linkage success, and explicit visibility for drops/partials instead of silent failure.

## Why This Approach
We considered broader consolidation and platform expansion options, but chose a YAGNI-first path that directly addresses current confidence gaps.

This approach is best because it targets the immediate question ("is this effective and correct?") with measurable outcomes, while preserving optionality for later architecture changes. It avoids large migration risk and reduces ambiguity by setting concrete quality thresholds and visibility requirements first.

## Key Decisions
- **Approach selected:** Quality-first hardening of current pipeline (not a full re-architecture).
- **P0 success priority:** Coverage correctness is the top outcome.
- **Acceptance bar:** Pragmatic thresholds (>=95% ingest, >=90% linkage, visible drops).
- **P0 scope:** Parser completeness + drop visibility + linkage QA.
- **Data sources:** Include traces/logs flowing from `/Users/jamiecraik/.codex/otel-collector/` for Codex/Claude.

## Open Questions
- Should acceptance thresholds be measured per tool/source (Codex vs Claude) or globally first?
- What review SLA is acceptable for surfaced drops/partials?
- Which confidence states should block attribution-dependent UI from presenting "high trust" signals?

## Next Steps
→ Run `/prompts:workflows-plan` to define implementation sequencing, ownership, validation checks, and rollout controls for this brainstorm.
