---
title: "feat: Add Recall Lane for Faster Comprehension"
type: feat
status: draft
date: 2026-02-27
origin: docs/brainstorms/2026-02-27-recall-lane-comprehension-brainstorm.md
---

# feat: Add Recall Lane for Faster Comprehension

## Table of Contents
- [Enhancement Summary](#enhancement-summary)
- [Deepening Summary](#deepening-summary)
- [Section Manifest](#section-manifest)
- [Research Findings](#research-findings)
- [Brainstorm Carry-Over](#brainstorm-carry-over)
- [Problem Statement](#problem-statement)
- [Proposed Solution](#proposed-solution)
- [Alternative Approach Considered](#alternative-approach-considered)
- [Technical Approach](#technical-approach)
- [System-Wide Impact](#system-wide-impact)
- [SpecFlow/Edge-Case Analysis](#specflowedge-case-analysis)
- [Implementation Plan](#implementation-plan)
- [Acceptance Criteria](#acceptance-criteria)
- [Success Metrics](#success-metrics)
- [Dependencies & Risks](#dependencies--risks)
- [Testing Strategy](#testing-strategy)
- [Open Questions](#open-questions)
- [Sources & References](#sources--references)

## Enhancement Summary

Add a summary-first **Recall Lane** surface that surfaces ranked, confidence-tagged material changes and fast evidence jumps before opening deeper layers (evidence/diff). The feature keeps inference-only behavior and local-first inputs, preserving existing fallback safety.

## Deepening Summary

**Deepened on:** 2026-02-27  
**Sections enhanced:** 12  
**Research agents used:** repo context pass, web docs pass, default sub-agent analyses (5), local learnings scan.

### Key Improvements
1. Added deterministic safety and UX contracts for low-signal/low-confidence, empty-state, and branch-switch behavior.
2. Added explicit research-backed implementation guidance for list rendering determinism, accessibility testing, and telemetry observability.
3. Added concrete failure-surface tests and acceptance criteria for ordering, evidence routing, and fallback behavior.

### New Considerations Discovered
- Need explicit source/attribution for evidence actions (`recall_lane`) to support ratio metrics reliably.
- Stable ordering and tie-breaker strategy should include an explicit deterministic secondary key, even on stable-sort runtimes.
- Controller/panel prop propagation introduces a type ripple across layout/tests; start lane prop as optional to avoid accidental breakage.

## Section Manifest

- **Enhancement Summary** — verify target behavior and desired outcome alignment.
- **Research Findings** — preserve authoritative inputs and distinguish verified facts vs assumptions.
- **Brainstorm Carry-Over** — ensure all prior constraints/decs remain intact.
- **Problem Statement** — validate need and scope boundaries.
- **Proposed Solution** — sharpen in-scope/out-of-scope and UX contracts.
- **Alternative Approach Considered** — preserve decision rationale and reject reasons.
- **Technical Approach** — add deterministic ranking contract, typed item model, and wiring specifics.
- **System-Wide Impact** — map render flow, error propagation, and rollback behavior.
- **SpecFlow/Edge-Case Analysis** — capture Given/When/Then gaps and race conditions.
- **Implementation Plan** — phase gates with completion checks and ordering constraints.
- **Acceptance Criteria** — make each criterion verifiable.
- **Success Metrics** — define baseline and measurement method.
- **Dependencies & Risks** — separate hard/soft dependencies and owner-aware mitigations.
- **Testing Strategy** — add utility/component/controller test layers and commands.
- **Open Questions / Sources** — keep unresolved decisions explicit before execution.

## Research Findings

- **Step 0 (match):** Found relevant brainstorm doc: `docs/brainstorms/2026-02-27-recall-lane-comprehension-brainstorm.md` (within 14 days). Reusing as authoritative context.
- **Repo-local research (manual, completed):**
  - Narrative composition builds commit-based highlights and confidence from `composeBranchNarrative` in `src/core/narrative/composeBranchNarrative.ts:14-213`.
  - Summary rendering exists in `src/ui/components/BranchNarrativePanel.tsx:83-229`.
  - Branch orchestration and evidence/diff routing in `src/ui/views/branch-view/useBranchViewController.ts:214-239` and `:535-581`.
  - Rollout/kill-switch behavior in `src/core/narrative/rolloutGovernance.ts:1-200`.
- **Learnings scan:** one relevant solution file found in `docs/solutions/integration-issues/codex-app-server-claude-otel-stream-reliability-auth-migration-hardening.md`.
  - Relevant transfer points: deterministic precedence/error fallback patterns map directly to ranking + lane failure contracts.
  - Non-transferable parts are backend migration/auth-specific.
- **Framework docs consulted:**
  - React list rendering and stable list keys: https://react.dev/learn/rendering-lists
  - Testing Library query priority (`getByRole`): https://testing-library.com/docs/queries/about and https://testing-library.com/docs/queries/byrole
  - Vitest timer/mocking guidance (for deferred updates or debounce tests): https://vitest.dev/guide/mocking/timers
- **External research decision:** kept local + existing plan pattern as primary; best-practice pass added for determinism, a11y, and test observability.
- **Verified / Assumptions / Unknowns:**
  - Verified: no backend/data-source changes required; existing evidence path already supports `commit/diff` routing.
  - Assumption: confidence bands (high/medium/low) remain stable enough for user-facing trust labels.
  - Unknown: lane-to-evidence action metric observability until telemetry schema is updated.

## Brainstorm Carry-Over

From `docs/brainstorms/2026-02-27-recall-lane-comprehension-brainstorm.md` carry forward:

- **Approach B selected:** dedicated summary-layer Recall Lane.
- **Scope:** summary first; evidence and raw diff remain lower layers.
- **Input model (v1):** inference-only, no manual inputs.
- **Trust behavior:** reuse existing confidence/evidence; low-confidence cases should reinforce raw-diff fallback.
- **Signal inputs:** existing `session`, `trace`, `test`, `anchor`-adjacent signals.
- **Data posture:** local sources only.
- **Open questions from brainstorm:** none blocking.

### Research Insights

- Keep all design choices constrained to summary layer and local narrative inputs.
- Treat lane data as a projection of existing narrative model, not a parallel scoring pipeline.
- Maintain “no manual inputs” to avoid scope creep.

## Problem Statement

Developers re-entering context still need to manually infer what is most important from the current narrative block. Existing summary already shows highlights but does not explicitly present a prioritized “what to inspect first” lane with trust posture and evidence-jump affordances.

### Research Insights

**Best Practices:**
- Present the highest-priority action first (`high confidence` lane head) and keep fallback guidance visible for weak narratives.
- Explicitly mark when evidence is insufficient to avoid over-trust in weak signals.

**Performance Considerations:**
- Keep lane computation off the critical async path by memoizing derived arrays per branch state.

**Acceptance Additions:**
- Add “story-first” requirement: top lane item must appear within summary open path, not only after manual actions.

## Proposed Solution

Introduce a compact `Recall Lane` block inside summary mode that:

1. Ranks a small list of decision-relevant items from existing narrative signals.
2. Displays per-item confidence as an explicit trust marker.
3. Provides fast evidence jumps using existing evidence links.
4. Leaves all current fallback and kill-switch behavior intact.

The Recall Lane remains additive and local-first (`(see brainstorm)`), with no new external connector.

### Research Insights

**Best Practices:**
- Define interface contracts explicitly:
  - `NarrativeRecallLaneItem[]` with stable IDs, `confidence`, `confidenceTier`, `whyThisMatters`, `evidenceLinks`.
- In-scope/out-of-scope should include “no new manual ranking controls” and “no new backend schema.”

**Performance Considerations:**
- Limit lane length to top 3/5 items.
- Use comparator with explicit tie-breaker (confidence desc, then deterministic ID).

**Implementation Details:**
```ts
export interface NarrativeRecallLaneItem {
  id: string;
  title: string;
  whyThisMatters: string;
  confidence: number;
  confidenceTier: "high" | "medium" | "low";
  evidenceLinks: BranchEvidenceLink[];
  source: "highlight" | "fallback";
}
```

**Edge Cases:**
- Empty candidate set on sparse signals.
- Items with malformed/no evidence links.
- Identical confidence ties causing potential reorder jitter.

**References:**
- https://react.dev/learn/rendering-lists

## Alternative Approach Considered

- **Approach A (tune current scoring only):** smaller change set, but does not solve the “material-first comprehension at first glance” problem.
- **Approach B (selected):** dedicated lane in summary for clarity, ranking, trust, and jump points.
- **Approach C (full decision timeline):** bigger scope and higher UI risk for v1.

### Research Insights

**Comparative notes:**
- A and C were rejected for scope/cognitive reasons; Approach B remains best with lowest coupling risk.
- Keep Approach B as MVP and defer timeline/history feature to v2.

## Technical Approach

### 1) Core recall derivation helper
Add a small helper module, e.g.
`src/core/narrative/recallLane.ts`:

- Input: `BranchNarrative` (or a narrow DTO derived from it).
- Output: ordered array of `NarrativeRecallLaneItem` objects.
- Ranking: confidence desc + stable tie-breaker to avoid order jitter.
- Comparator MUST define a total order (deterministic under equal confidence):
  1. confidence (descending, with malformed values clamped to 0),
  2. confidenceTier (`high` > `medium` > `low`),
  3. source (`highlight` before `fallback`),
  4. stable `sourceIndex`/input index,
  5. deterministic `id` lexical fallback.
- Confidence tiers:
  - `high` >= 0.75, `medium` >= 0.55, `low` otherwise.
- Item evidence: at least one link per item, preserving existing evidence order.
- Empty state support: if highlights unavailable, return a minimal fallback item from intent/summative narrative.
- Guardrail: function never throws; errors degrade to minimal empty lane.

### 2026 Hardening Contract (Deterministic, Type-Safe, Fallback-First)
Adopt this contract in implementation and tests:
- **Determinism:** same input sequence → same lane output order and IDs.
- **Type safety:** derive `NarrativeRecallLaneItem` from existing `BranchNarrative` via a narrow mapper; runtime checks for missing IDs/confidence/link arrays.
- **Input sanitation:** coerce malformed confidence (`NaN`, negative, >1, null/undefined) to `0` before tiering to avoid unstable sort outcomes.
- **Failure policy:** never throw from `buildRecallLane`; return `[]` with a debug field on telemetry only when derivation inputs are unusable.
  - `sanitizeConfidence` is applied during mapping and comparator additionally normalizes as a defense-in-depth guard for any legacy callers.
- **Traceability:** every lane action row includes stable `id`, `title`, and `whyThisMatters` so evidence clicks can be audited after action.

Suggested new type: `NarrativeRecallLaneItem` near `NarrativeHighlight` in `src/core/types.ts`.

### 2) UI presentation in summary layer
Extend `src/ui/components/BranchNarrativePanel.tsx:118-229`:

- Render `Recall Lane` before the prose summary within summary tab.
- Each row includes:
  - title
  - rationale (`whyThisMatters`)
  - confidence tier and percentage
  - evidence buttons using existing `onOpenEvidence` callback.
- Empty lane state: short prompt to open raw diff or evidence as available.
- Maintain current audience/feedback/diff controls and existing fallback message.

### 3) Orchestration wiring
In `src/ui/views/branch-view/useBranchViewController.ts`:

- Compute recall lane items from composed narrative and pass through `narrativePanelProps`.
- Keep `onOpenEvidence` and `onOpenRawDiff` callbacks unchanged; lane actions reuse existing behavior.
- No changes needed to kill-switch logic unless lane rendering violates current fallback contract.
- Introduce a small telemetry guard in the existing evidence action handler path to set:
  - `event.source = "recall_lane"` for lane-initiated evidence opens,
  - `event.recallLaneItemId` for row-level correlation,
  - `event.recallLaneConfidenceBand` for trust auditability.
- Gate lane payload and callbacks on memoized branch identity (`branchPath`/`branchId`) to avoid stale callbacks on rapid branch-switches.

### 4) Optional UX copy / a11y polish
- Add compact tier labels and `aria-live` hints for confidence/low-quality states.
- Keep wording aligned with existing low-confidence fallback language from compose layer (`fallbackReason`) to avoid contradictions.

### Research Insights

**Best Practices:**
- Prefer semantic HTML (`<ul>/<li>`, `<button>`) and `aria-live` for confidence/empty-state changes.
- In tests, prefer role queries (`getByRole('button', { name: ... })`) as Testing Library recommends for user-centric queries.

**Performance Considerations:**
- Memoize lane derivation in controller (`useMemo`) to avoid recomputation on unrelated renders.
- Use stable keys from narrative item IDs; avoid generated/random keys (React keys guide).

**Implementation Details:**
```tsx
const recallLaneItems = useMemo(() => {
  if (!narrative) return [];
  return buildRecallLane(narrative, { maxItems: 3, confidenceFloor: 0.25 });
}, [narrative]);
```

```ts
type TierWeight = "high" | "medium" | "low";
const TIER_WEIGHT: Record<TierWeight, number> = { low: 0, medium: 1, high: 2 };
const sanitizeConfidence = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
};
```

```ts
const sourceWeight: Record<NarrativeRecallLaneItem["source"], number> = {
  highlight: 1,
  fallback: 0,
};

const compareRecallLaneItems = (
  a: { item: NarrativeRecallLaneItem; sourceIndex: number },
  b: { item: NarrativeRecallLaneItem; sourceIndex: number },
) => {
  const tierWeight = (tier: NarrativeRecallLaneItem["confidenceTier"]) => TIER_WEIGHT[tier];
  const confidenceA = sanitizeConfidence(a.item.confidence);
  const confidenceB = sanitizeConfidence(b.item.confidence);

  return (
    confidenceB - confidenceA ||
    tierWeight(b.item.confidenceTier) - tierWeight(a.item.confidenceTier) ||
    sourceWeight[b.item.source] - sourceWeight[a.item.source] ||
    a.sourceIndex - b.sourceIndex ||
    a.item.id.localeCompare(b.item.id)
  );
};
```

```tsx
<ol>
  {recallLaneItems.map((item) => (
    <li key={item.id}>
      {item.evidenceLinks[0] ? (
        <button type="button" onClick={() => onOpenEvidence(item.evidenceLinks[0])}>
          Open evidence
        </button>
      ) : (
        <button type="button" onClick={() => onOpenRawDiff()}>
          Open raw diff
        </button>
      )}
    </li>
  ))}
</ol>
```

**Edge Cases:**
- Do not render broken actions when evidence list is empty; route to raw diff with explicit copy.
- Ensure rollback/fallback states disable lane rendering where needed.

**References:**
- https://react.dev/learn/rendering-lists
- https://testing-library.com/docs/queries/about

## System-Wide Impact

### Interaction graph
- User opens branch → `composeBranchNarrative` computes highlights/confidence (`composeBranchNarrative.ts`) → `useBranchViewController` builds derived narrative (`useBranchViewController.ts:214-239`) → `BranchNarrativePanel` renders Recall Lane (`BranchNarrativePanel.tsx`).
- Clicking a lane evidence link dispatches existing evidence path (`useBranchViewController.ts:563-581`) and can transition to raw diff if link kind requires it (`src/ui/views/branchViewEvidence.ts`).
- Existing governance and telemetry still execute based on layer switches, layer detail, evidence opened, and fallback events.

### Error propagation
- If lane derivation fails, fallback to summary bullets without blocking branch rendering.
- If evidence links are stale/invalid, existing `handleOpenEvidence` behavior determines fallback and continues.
- Kill-switch (`needs_attention`/rollback) still forces effective detail to diff; Recall Lane should remain non-blocking in summary mode if summary remains allowed.

### State lifecycle risks
- Unstable lane ordering across renders: mitigate by stable sort and memoized derivation in controller.
- Evidence count mismatches: show lane row with no evidence as “open raw diff for verification.”
- Branch-switch race condition: ensure lane source is tied to branch key in memoization.

### API surface parity
- Additions limited to narrative/UX pipeline.
- No new backend or connector surface.

### Integration test scenarios
1. High-confidence summary lane renders ranked items with confidence tier.
2. Low-confidence narrative retains fallback guidance and still allows lane interaction.
3. Lane action on commit evidence navigates to the commit context.
4. Empty evidence path shows stable fallback text and diff fallback remains available.
5. Branch change does not preserve stale lane from previous branch.

### Research Insights

**Performance and UX Risks:**
- Track lane render and branch-switch latency to catch expensive recomputations on large histories.
- Keep lane count capped to avoid scroll fatigue and dense action surfaces.

**Telemetry recommendation:**
- Add source attribution for evidence actions (e.g., `source: "recall_lane" | "highlight"`) so lane metrics become observable.

## SpecFlow/Edge-Case Analysis

### User-flow checks
- Open branch with rich commit signals → lane should quickly surface high-value items.
- Open branch with sparse signals → lane should still present minimal readable guidance.
- Low signal + low confidence → explicit trust warning with raw-diff recommendation.

### Edge cases
- `narrative.state === 'failed'` (no commits): lane should be empty and non-blocking.
- Tied confidence values: stable deterministic ordering required.
- Rapid branch switch: lane recalculates with memoized inputs to avoid stale rows.
- Existing evidence-diff routing edge case: diff-kind links still use existing routing policy.

### Research Insights

**Gaps converted to Given/When/Then:**
- **Given** rollout is in rollback state, **when** summary opens, **then** Recall Lane does not present misleading actions.
- **Given** stale evidence link, **when** user clicks, **then** fallback guidance appears without throwing.
- **Given** >N lane candidates, **when** lane renders, **then** exactly N items appear with stable tie-breaking.

**Additional Edge Cases from research review:**
- In-flight branch changes while click handler resolves.
- Evidence path stale against branch timeline.
- Malformed confidence values (NaN/out of range) must be coerced into low-confidence state.

**References:**
- https://react.dev/learn/rendering-lists
- https://testing-library.com/docs/queries/byrole

## Implementation Plan

### Phase 1 — Model/utility extraction (1 day)
- Add `NarrativeRecallLaneItem` type.
- Add `buildRecallLane` helper with tests.
- Add/update tests for ordering, empty state, confidence tiers.
- Add a pure comparator helper (`compareRecallLaneItems`) and dedicated unit tests for total-order determinism and malformed-input sanitization.

### Phase 2 — Summary UI integration (1 day)
- Update `BranchNarrativePanel` to render Recall Lane in summary mode.
- Add lane interaction tests and empty state coverage.
- Keep all existing summary/evidence/diff controls.
- Add an accessible ordered list wrapper (`<ol>`) and ensure action labels are stable and locale-safe.

### Phase 3 — Wiring + rollout validation (1 day)
- Compute lane in `useBranchViewController` and pass to panel props.
- Update related tests for controller prop shape if needed.
- Ensure low-confidence and kill-switch copy remains consistent.
- Extend the existing branch evidence telemetry event contract to include:
  - `source: "recall_lane"` for actions initiated from Recall Lane.
  - `recallLaneItemId` and `recallLaneConfidenceBand`.
- Update telemetry typing/guards (and targeted unit tests) so `source` is validated for evidence-action events.
- Normalize telemetry on branch changes by dropping stale lane action metadata when `branchId` no longer matches current panel state.

### Phase 4 — Verification (0.5–1 day)
- Run targeted test files and broader narrative/ui test subset.
- Confirm no regressions in governance telemetry and fallbacks.
- Add a regression assertion that evidence actions triggered from Recall Lane emit `source: "recall_lane"` and valid `recallLaneItemId`.
- Verify no console errors during rapid branch switching and evidence clicks (simulated in controller test).

### Research Insights

**Phase-level DoD additions:**
- Phase 1 DoD: utility tests include tie-breaker and “never throws” checks.
- Phase 2 DoD: lane is keyboard reachable with stable action labels.
- Phase 3 DoD: branch-switch integration test verifies no stale rows.
- Phase 4 DoD: telemetry contract tests for `recall_lane` pass plus required commands pass with no new flakes in touched suites.

## Acceptance Criteria

- [ ] Brainstorm carry-over is preserved (summary-first, inference-only v1, local-first source signals).
- [ ] `BranchNarrativePanel` summary mode includes a compact Recall Lane block.
- [ ] Recall Lane items are ordered deterministically and include confidence tier/percent markers.
- [ ] At least one action is available per lane item: `Open evidence` when links exist, otherwise `Open raw diff`.
- [ ] Existing low-confidence fallback messaging still appears when narrative confidence is low.
- [ ] Lane actions route through current evidence/raw-diff path (`handleOpenEvidence` / `handleOpenRawDiff`).
- [ ] No manual data entry is introduced in v1.
- [ ] Tests cover: utility ordering/fallback, panel rendering/action callbacks, and branch-level orchestration stability.
- [ ] Recall Lane evidence actions emit telemetry payload with `source: "recall_lane"` and `recallLaneItemId`.
- [ ] Build output is deterministic for equal confidence items across repeated renders and branch reloads.
- [ ] Lane rows with malformed confidence values never crash or reorder unpredictably (coerced to low-confidence).

### Research Insights

**Strengthened Criteria (added):**
- [ ] Deterministic ordering is reproducible across renders given equal confidence via explicit tie-breaker.
- [ ] Lane does not render when rollback/failsafe path requires full-diff-only mode.
- [ ] Lane action telemetry includes source attribution (`recall_lane`) when evidence action is triggered.
- [ ] Evidence-less rows provide explicit `Open raw diff` guidance and remain non-blocking.
- [ ] Evidence actions can be clicked while branch transitions; handler must ignore stale branch context and avoid mis-routing to old branch evidence.

## Success Metrics

- Reduce average “summary-to-comprehension” time by 15% in targeted manual user checks.
- Increase lane-to-evidence action ratio for applicable branches (target: >=60% for top 2 lane items).
- No increase in fallback-to-raw-diff ratio vs baseline for matched branch sample set.
- No new deterministic failures in narrative tests touching `composeBranchNarrative`, `BranchNarrativePanel`, or `BranchView` flows.

### Research Insights

**Measurement guardrails:**
- Define baseline window and sample size (e.g., 30 qualifying branches/session replay set).
- Exclude lanes with zero evidence links from lane-to-evidence denominator.
- Track confidence-segmented metrics to avoid rewarding low-quality action loops.

## Dependencies & Risks

### Dependencies
- Existing narrative composition/evidence pipeline.
- Frontend test stack (`vitest`, Testing Library) and existing mocked hooks pattern.

### Risks and mitigations
- **Noisy prioritization:** keep confidence thresholds conservative in v1 and cap lane length.
- **Re-ranking confusion:** show rationale source text to make ranking explainable.
- **Scope creep:** avoid adding connectors/manual inputs in v1.

### Research Insights

**Additional risks:**
- **Telemetry blind spot:** if analytics pipelines are not updated in the same release, lane->evidence metrics will be delayed or partial.
- **Type ripple:** adding required props can break component tests; consider optional `recallLaneItems` prop as transitional strategy.
- **Data staleness:** enforce branch-key in memoization.

## Testing Strategy

- Unit tests:
  - `src/core/narrative/recallLane.ts` (new utility).
- Component tests:
  - `src/ui/components/__tests__/BranchNarrativePanel.test.tsx`.
- Integration/controller tests:
  - `src/ui/views/__tests__/BranchView.test.tsx` (observability/telemetry expectations if prop changes are introduced).
- Regression tests:
  - existing files:
    - `src/core/narrative/__tests__/composeBranchNarrative.test.ts`
    - `src/core/narrative/__tests__/rolloutGovernance.test.ts`
    - `src/ui/components/__tests__/BranchNarrativePanel.test.tsx`
    - `src/ui/views/__tests__/BranchView.test.tsx`
  - new file:
    - `src/core/narrative/__tests__/recallLane.test.ts`

### Test commands
- `pnpm test src/core/narrative/__tests__/composeBranchNarrative.test.ts`
- `pnpm test src/core/narrative/__tests__/recallLane.test.ts`
- `pnpm test src/ui/components/__tests__/BranchNarrativePanel.test.tsx`
- `pnpm test src/ui/views/__tests__/BranchView.test.tsx`

### Research Insights

**Additional test additions:**
- New file: `src/core/narrative/__tests__/recallLane.test.ts`
- Add Given/When/Then style assertions for edge cases from the gap analysis.
- Validate accessible query usage in component tests (button/heading/list roles).
- Optional future hardening: `vi.useFakeTimers()` for any deferred rendering path (`https://vitest.dev/guide/mocking/timers`).

### Gold-Standard deterministic test matrix (required)
- Deterministic ordering: equal-confidence inputs produce identical order across shuffled input permutations.
- Input sanitation: malformed confidence values (`NaN`, negatives, >1, missing) clamp to `low` tier and do not throw.
- Idempotence and stability: repeated `buildRecallLane` calls with same input are deep-equal.
- Branch transition safety: stale row click paths are ignored after branch context changes.
- Telemetry contract checks: `recall_lane` emission plus correlation fields included on lane actions.

## Open Questions

- Deferred (non-blocking) decision points:
  - lane length default (3 vs 5), default target for MVP remains 3 unless UX feedback suggests 5.
  - trust-badge wording and confidence-band labels.

## Sources & References

- Brainstorm origin: `docs/brainstorms/2026-02-27-recall-lane-comprehension-brainstorm.md`
  - Key decisions carried forward: summary-layer-first, inference-only v1, local-first, explicit trust/fallback behavior.
- Internal references:
  - `src/core/narrative/composeBranchNarrative.ts` (highlights/confidence/evidence shaping)
  - `src/ui/components/BranchNarrativePanel.tsx` (summary rendering + evidence/diff controls)
  - `src/ui/views/branch-view/useBranchViewController.ts` (narrative orchestration + evidence/fallback telemetry)
  - `src/core/narrative/rolloutGovernance.ts` (kill-switch and quality guardrails)
  - `src/core/narrative/decisionArchaeology.ts` (existing decision/impact model)
- External references:
  - https://react.dev/learn/rendering-lists
  - https://testing-library.com/docs/queries/byrole
  - https://testing-library.com/docs/queries/about
  - https://vitest.dev/guide/mocking/timers
- Learned solutions:
  - `docs/solutions/integration-issues/codex-app-server-claude-otel-stream-reliability-auth-migration-hardening.md`
