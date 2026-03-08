---
title: "First-win baseline metrics capture"
type: baseline
date: 2026-03-08
plan: docs/plans/2026-03-04-feat-first-win-commit-story-loop-plan.md
---

# First-win Baseline Metrics Capture

## Purpose

This document defines the baseline metrics to capture before implementing Phase 1 changes. These metrics establish the current state of the first-win funnel and will be used to measure improvement.

## Metric Definitions

### Funnel Completion Metrics

| Metric | Definition | Source Event | Target |
|--------|------------|--------------|--------|
| `p95_completion_latency_ms` | Time from `what_ready` to `evidence_ready` | `first_win_completed.flowLatencyMs` | ≤ 30,000ms |
| `p95_what_to_why_ms` | Time from `what_ready` to `why_ready` | `ask_why_answer_viewed.flowLatencyMs` | ≤ 10,000ms |
| `p95_why_to_evidence_ms` | Time from `why_ready` to `evidence_ready` | `ask_why_evidence_opened.flowLatencyMs` | ≤ 8,000ms |

### Quality Metrics

| Metric | Definition | Calculation | Target |
|--------|------------|-------------|--------|
| `stale_ignore_rate` | Fraction of requests dropped as stale | `stale_ignored` / (`stale_ignored` + `success` + `fallback` + `failed`) | < 1% |
| `fallback_rate` | Fraction of interactions using fallback | `fallback` / (`success` + `fallback` + `failed`) | < 60% alert |
| `success_rate` | Fraction of successful interactions | `success` / (`success` + `fallback` + `failed`) | No baseline target |

### Denominator Metrics

| Event | Purpose | Required Fields |
|-------|---------|-----------------|
| `what_ready` | Funnel entry anchor | `attemptId`, `branchScope`, `itemId`, `funnelSessionId` |
| `why_requested` | Ask-why funnel entry | `attemptId`, `branchScope`, `queryId` |
| `evidence_requested` | Evidence funnel entry | `attemptId`, `branchScope`, `citationId` |

### Terminal Outcome Events

| Event | Outcome | Funnel Step |
|-------|---------|-------------|
| `first_win_completed` | `success`, `fallback`, `failed` | `evidence_ready` |
| `ask_why_answer_viewed` | `success`, `fallback` | `why_ready` |
| `ask_why_evidence_opened` | `success` | `evidence_ready` |
| `ask_why_fallback_used` | `fallback` | `evidence_requested` |
| `ask_why_error` | `failed`, `stale_ignored` | `why_ready` |

## Baseline Capture Procedure

### 1. Enable Telemetry Collection

```bash
# Ensure telemetry is enabled (already on by default)
# Verify in runtime config
grep -r "consentGranted" src/
```

### 2. Collect Baseline Sample
- Duration: 14 days minimum
- Minimum sample: 50 denominator events per repo
- Scope: Repos with first-win feature enabled

### 3. Calculate Baseline Metrics

```typescript
// Example aggregation query (conceptual)
const metrics = {
  p95_completion_latency_ms: p95(flowLatencyMs where event = 'first_win_completed'),
  p95_what_to_why_ms: p95(flowLatencyMs where event = 'ask_why_answer_viewed'),
  stale_ignore_rate: count(stale_ignored) / count(total_outcomes),
  fallback_rate: count(fallback) / count(success + fallback + failed),
};
```

## Current Baseline (To Be Captured)

| Metric | Baseline Value | Target | Gap |
|--------|----------------|--------|-----|
| `p95_completion_latency_ms` | TBD | ≤ 30,000ms | TBD |
| `p95_what_to_why_ms` | TBD | ≤ 10,000ms | TBD |
| `p95_why_to_evidence_ms` | TBD | ≤ 8,000ms | TBD |
| `stale_ignore_rate` | TBD | < 1% | TBD |
| `fallback_rate` | TBD | < 60% | TBD |

## Telemetry Event Verification
### Events Already Implemented

- [x] `what_ready` - Emitted in `useBranchTelemetry.ts:147`
- [x] `narrative_viewed` - Emitted in `useBranchTelemetry.ts:115`
- [x] `first_win_completed` - Schema defined, emits on `evidence_ready`
- [x] `ask_why_submitted` - Emitted in `useBranchAskWhyState.ts`
- [x] `ask_why_answer_viewed` - Emitted with `flowLatencyMs`
- [x] `ask_why_evidence_opened` - Emitted with `funnelStep: evidence_ready`
- [x] `ask_why_fallback_used` - Emitted with `eventOutcome: fallback`
- [x] `ask_why_error` - Emitted with `eventOutcome: failed` or `stale_ignored`

### Fields Verified

- [x] `attemptId` - Required for all first-win flow events
- [x] `branchScope` - Pseudonymized repo+branch hash
- [x] `funnelSessionId` - Stable session identifier
- [x] `funnelStep` - Canonical step names
- [x] `eventOutcome` - Terminal outcome classification
- [x] `flowLatencyMs` - Latency measurement

---

# Rollout Kill Criteria

## Kill Switch Triggers

The following conditions will trigger an immediate rollback:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| `stale_ignore_rate` | > 5% (5x target) | Disable first-win guidance |
| `fallback_rate` | > 80% (1.3x baseline) | Alert + review |
| `p95_completion_latency_ms` | > 60,000ms (2x target) | Alert + review |
| `error_rate` | > 10% | Alert + review |

## Rollback Procedure

1. **Immediate:** Set `firstWinGuidanceEnabled = false` in runtime config
2. **Verify:** Confirm telemetry shows return to baseline behavior
3. **Document:** Record incident in plan notes with root cause

## Rollback Owner

- **Owner:** Jamie Craik
- **Contact:** Via GitHub issues or direct
- **Escalation:** If owner unavailable, any project maintainer may trigger rollback

## Monitoring
- **Frequency:** Daily review during first 7 days post-release
- **Weekly:** Review funnel metrics and first 4 weeks
- **Monthly:** Review for drift thereafter

---

## Notes

- Baseline values will be filled after 14-day collection period
- Kill criteria are intentionally conservative to catch regressions early
- Rollback does safe - first-win is additive UX, not critical path
