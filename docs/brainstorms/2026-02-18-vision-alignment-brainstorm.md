# Narrative Vision Alignment Brainstorm

**Date:** 2026-02-18  
**Topic:** Align current Narrative implementation with original narrative-first vision  
**Status:** Exploratory

---

## Table of Contents

- [What We’re Building](#what-were-building)
- [Current Implementation Snapshot](#current-implementation-snapshot)
- [Approach Options](#approach-options)
- [Why This Approach](#why-this-approach)
- [Key Decisions](#key-decisions)
- [Open Questions](#open-questions)

---

## What We’re Building

A narrative-first version control experience where **intent becomes the primary entry point**, and diffs are progressively disclosed. The target experience should help technical and non-technical stakeholders understand: what changed, why it changed, and which human/AI interactions produced the change.

This includes:
- branch-level story summaries,
- session-to-commit traceability,
- meaningful “highlight moments,”
- multi-level timeline abstraction,
- local-first storage with optional team-sync surfaces.

---

## Current Implementation Snapshot

### Implemented (strong alignment)
- Local-first architecture with `.narrative/` metadata + local SQLite indexing.
- Session import + linking across multiple tools (Claude, Codex, Cursor, Gemini, Copilot, Continue, Kimi).
- Agent Trace-style structured attribution (trace records, file/range contributors, AI/human/mixed labels).
- Atlas local full-text session search with bounded retrieval.
- Story Anchors (Git Notes) support for attribution/sessions/lineage metadata.

### Partial (needs product polish)
- “Intent” is currently commit-subject driven, not conversation-derived.
- Branch header shows AI prompt/response counts, but summary language is still technical and sparse.
- Session highlights exist, but “key moments” are heuristic and shallow.
- Timeline supports milestones in demo mode, but repo mode is commit-centric.

### Missing (vision gap)
- True progressive disclosure stack (executive → manager → engineer views).
- Non-technical branch narrative generated from prompts + diffs.
- Explicit “decision archaeology” surfaces (why this design tradeoff happened).
- Context beyond code (docs/meetings/slack/email links) as first-class narrative artifacts.
- GitHub org-level webhook ingestion + shared backend parity.

---

## Approach Options

### 1) **Narrative Parity Track (Recommended)**
Create a focused “Vision Parity” epic: branch story synthesis, session highlight ranking, repo milestone generation, and stakeholder view presets.
- **Pros:** Highest alignment with original thesis; visible user value fast.
- **Cons:** Requires product + data-model evolution.
- **Best when:** Goal is to ship the original vision, not just improve tooling.

### 2) Observability-First Expansion
Deepen trace fidelity/search first (semantic retrieval, better cross-agent telemetry), defer UX reframing.
- **Pros:** Strong technical foundation.
- **Cons:** Keeps comprehension burden high for non-technical users.
- **Best when:** Accuracy instrumentation is priority.

### 3) Team Context Integrations First
Prioritize GitHub + workspace context connectors before UI narrative redesign.
- **Pros:** Strong enterprise story.
- **Cons:** Risks scaling context without usable abstraction.
- **Best when:** Immediate org rollout is the priority.

---

## Why This Approach

Choose **Narrative Parity Track** first. The current implementation has solid primitives (trace model, session linking, local search, notes), but the original differentiator is not raw data capture—it is **comprehension via abstraction**. Shipping that layer now unlocks onboarding, cross-functional collaboration, and decision archaeology outcomes directly tied to the manifesto.

---

## Key Decisions

- Treat current architecture as a strong base; avoid rewrite.
- Prioritize narrative synthesis + progressive disclosure before broader integrations.
- Use Agent Trace + Git Notes as substrate, not end-user surface.
- Keep local-first default; add shared/team context as optional layers.

---

## Open Questions

1. Should branch-level summaries be generated at commit time, or lazily on view?
2. Which stakeholder layers are required for v1: Exec + Engineer, or Exec + Manager + Engineer?
3. Should “key moments” be inferred from prompt semantics, code churn signals, or both?
4. For context-beyond-code, what is the first connector: GitHub metadata, docs, or chat?

