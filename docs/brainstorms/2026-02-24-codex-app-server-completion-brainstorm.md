---
date: 2026-02-24
topic: codex-app-server-completion
author: brainstorm
audience: internal
---

# Codex App Server Completion Brainstorm

## Table of Contents
- [What We're Building](#what-were-building)
- [Why This Approach](#why-this-approach)
- [Approaches Considered](#approaches-considered)
- [Key Decisions](#key-decisions)
- [Open Questions](#open-questions)
- [Next Steps](#next-steps)

## What We're Building
Ship a complete Codex App Server runtime path for capture reliability, limited strictly to the Codex App Server scope.

In practical terms, the feature should replace the current status-only behavior with a true sidecar-owned runtime: spawn/supervise sidecar lifecycle, perform a real initialize/initialized handshake, emit live stream session events, handle approval actions in app flow, persist completed sessions with bounded cleanup, and tighten security/recovery behavior for reconnects, validation, and logging.

This excludes universal-plan tracks and adapter platform expansion (e.g., OTLP adapter manager, Kimi integration, IDE/CLI extension work).

## Why This Approach
The actor-first path is recommended because existing gaps are architectural, not cosmetic. Current code flips state without owning process/process-health realities, which leaves reliability, observability, and hardening incomplete in practice.

Keeping scope to Codex App Server-only enables a clear completion boundary and avoids delaying shipping by broadening into long-horizon roadmap tracks.

## Approaches Considered
### Approach A: Actor-First Runtime Hardening (**Recommended**)
Implement the Codex App Server as a sidecar actor: spawn at start, supervise health/reconnect, complete protocol handshake, expose internal-only stream transitions, and persist session state in a bounded lifecycle.

**Pros:** Directly addresses root blockers and creates deterministic operational behavior.
**Cons:** Most code movement up front; requires careful state transitions and tests.

### Approach B: Surface-to-Server Tightening
Keep startup in callers/UI and add incremental guards around existing stream commands and persistence.

**Pros:** Faster to land in the short term.
**Cons:** Leaves ambiguous ownership and does not solve the supervisory gap.

### Approach C: Full Universal App-Server Rewrite
Refactor around a generalized adapter/runtime platform before Codex-specific completion.

**Pros:** Highest long-term architectural leverage.
**Cons:** Expands scope significantly and conflicts with the requested ship-ready completion set.

## Key Decisions
- **Decision 1:** Limit completion to Codex App Server runtime path only; do not mix in universal adapter work.
- **Decision 2:** Treat sidecar supervision (spawn/monitor/shutdown/reconnect behavior) as mandatory completion criteria.
- **Decision 3:** Move stream state to active only after a real handshake (`initialize` + `initialized`).
- **Decision 4:** Emit `session:live:event` and approval-result events from server internals, not generic UI-callable mutators.
- **Decision 5:** Persist completed live sessions through the app-server path and enforce `live_sessions` cleanup with LRU rules in-band.
- **Decision 6:** Apply a minimal hardening baseline only where relevant to Codex App Server runtime: token refresh behavior, schema/session validation, reconnect strategy, and ingest logging.

## Open Questions
None.

## Next Steps
Run `/workflows:plan` for implementation sequencing, validation checks, and rollout gates for this Codex App Server-only scope.
