---
title: Codex App Server + Claude OTEL hybrid reliability hardening
slug: codex-app-server-claude-otel-stream-reliability-auth-migration-hardening
date: 2026-02-20
category: integration-issues
status: solved
summary: Resolved hybrid capture instability by enforcing sidecar-verified auth, deterministic OTEL/stream precedence, crash-loop threshold correctness, and robust collector migration/rollback behavior.
tags:
  - codex-app-server
  - claude
  - otel
  - hybrid-capture
  - auth-fsm
  - migration
  - tauri
related_prs:
  - https://github.com/jscraik/firefly-narrative/pull/25
related_commits:
  - a5bf183
  - 4996b4f
  - 048f33b
  - 9062444
related_paths:
  - /Users/jamiecraik/dev/narrative/src-tauri/src/codex_app_server.rs
  - /Users/jamiecraik/dev/narrative/src-tauri/src/ingest_config.rs
  - /Users/jamiecraik/dev/narrative/src/core/tauri/ingestConfig.ts
  - /Users/jamiecraik/dev/narrative/docs/plans/2026-02-19-feat-hybrid-codex-claude-capture-reliability-plan.md
  - /Users/jamiecraik/dev/narrative/docs/agents/hybrid-capture-rollout-runbook.md
---

# Codex App Server + Claude OTEL hybrid reliability hardening

## Table of Contents
- [Problem](#problem)
- [Symptoms](#symptoms)
- [Root cause](#root-cause)
- [What we changed](#what-we-changed)
- [How Claude OTEL + Codex stream data are used](#how-claude-otel--codex-stream-data-are-used)
- [Verification](#verification)
- [Prevention](#prevention)
- [Related documentation](#related-documentation)

## Problem
Hybrid capture (Codex sidecar stream + OTEL baseline) was not consistently reaching stable `HYBRID_ACTIVE` behavior, and migration/recovery paths were too fragile under failures.

## Symptoms
- Auth flow could stall or regress to degraded state when login completion was treated as success without sidecar verification.
- Restart crash-loop behavior did not trip at the intended boundary.
- Overlapping Codex stream and OTEL events needed deterministic source choice to avoid narrative drift.
- Collector migration/rollback could leave inconsistent state or incomplete failure metadata.
- OTEL config updates were insufficiently sanitized and could leave stale nested `[otel.*]` blocks.

## Root cause
1. Auth state transition logic lacked strict sidecar-verification semantics.
2. Crash-loop policy had an off-by-one threshold mismatch.
3. Migration logic could treat canonical stub state as “already migrated.”
4. Rollback error paths did not consistently persist failure state and cleanup.
5. Config writing needed stronger endpoint validation and table replacement behavior.
6. App identifier migration required canonical + legacy compatibility for config/secret lookups.

## What we changed
- Enforced sidecar-auth source of truth:
  - `codex_app_server_account_login_completed(success=true)` now stays `authenticating`.
  - `codex_app_server_account_updated(auth_mode="chatgpt", authenticated=true)` is the only path to `authenticated`.
- Corrected crash-loop containment to `>= 3 restarts in 60s` (`RESTART_BUDGET`).
- Kept deterministic event precedence and dedupe telemetry:
  - Stream preferred for delta events.
  - OTEL preferred for completed events.
  - Decision log/counters: `accepted | duplicate | replaced | dropped`.
- Hardened collector migration and rollback:
  - Detect canonical stub/empty directories as still requiring migration.
  - Snapshot current canonical state before restore.
  - Persist `failed` status + last error on all failure exits.
  - Add recovery cleanup for partial rollback restore.
- Hardened OTEL config update path:
  - Strict endpoint validation (scheme + control-char rejection).
  - Replace entire `[otel]` and nested `[otel.*]` sections safely.
- Aligned app identity compatibility across ingest config, CLI DB path, and secret store.
- Added integration harness + Rust test lane in CI to catch regressions earlier.

## How Claude OTEL + Codex stream data are used
- **OTEL baseline (durable):**
  - Claude data comes from configured watch paths (default includes `~/.claude/projects`).
  - Codex OTEL/log sources use `watch_paths.codex_logs` and receiver settings.
  - Baseline health drives `OTEL_ONLY` safety behavior.
- **Codex sidecar stream (enrichment):**
  - Used for near-real-time Codex updates when sidecar is healthy, initialized, and authenticated.
- **Capture mode evaluation:**
  - `HYBRID_ACTIVE` only when OTEL baseline is healthy **and** stream gate is fully healthy.
  - `DEGRADED_STREAMING` when OTEL is healthy but stream expected/failed.
  - `OTEL_ONLY` when baseline is healthy and stream is intentionally not expected.
  - `FAILURE` only when baseline is unavailable.

## Verification
Executed during remediation:
- `cargo test --manifest-path /Users/jamiecraik/dev/narrative/src-tauri/Cargo.toml codex_app_server`
- `cargo test --manifest-path /Users/jamiecraik/dev/narrative/src-tauri/Cargo.toml ingest_config`
- `pnpm test:integration`

Key assertions now covered:
- Restart threshold enters crash-loop at exact boundary.
- `chatgpt + authenticated=true` transitions to `authenticated`.
- Unsupported auth modes degrade safely.
- OTEL endpoint sanitization rejects unsafe values.
- OTEL block upsert replaces nested sections deterministically.

## Prevention
- Keep sidecar callback as sole auth authority (no client-side auth promotion).
- Keep crash-loop threshold test as release-blocking.
- Keep migration/rollback failure persistence tests release-blocking.
- Use runbook fallback quickly on stream instability:
  1. enable stream kill switch,
  2. stop sidecar,
  3. verify `OTEL_ONLY`/`DEGRADED_STREAMING`,
  4. recover handshake/auth in order,
  5. verify `HYBRID_ACTIVE`.

## Related documentation
- [/Users/jamiecraik/dev/narrative/docs/plans/2026-02-19-feat-hybrid-codex-claude-capture-reliability-plan.md](/Users/jamiecraik/dev/narrative/docs/plans/2026-02-19-feat-hybrid-codex-claude-capture-reliability-plan.md)
- [/Users/jamiecraik/dev/narrative/docs/agents/hybrid-capture-rollout-runbook.md](/Users/jamiecraik/dev/narrative/docs/agents/hybrid-capture-rollout-runbook.md)
- [/Users/jamiecraik/dev/narrative/docs/brainstorms/2026-02-19-hybrid-capture-reliability-brainstorm.md](/Users/jamiecraik/dev/narrative/docs/brainstorms/2026-02-19-hybrid-capture-reliability-brainstorm.md)
- [/Users/jamiecraik/dev/narrative/docs/brainstorms/2026-02-17-codex-app-server-integration-brainstorm.md](/Users/jamiecraik/dev/narrative/docs/brainstorms/2026-02-17-codex-app-server-integration-brainstorm.md)
