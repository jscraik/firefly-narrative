---
title: "refactor: Extract useBranchViewController into focused hooks"
type: refactor
status: draft
date: 2026-03-02
scope: ui/views/branch-view
impact: medium
effort: 2-3 hours
---

# Refactor: Extract useBranchViewController into Focused Hooks

## Problem

`useBranchViewController.ts` is 950 lines, making it:
- Hard to navigate and understand
- Difficult to test in isolation
- Prone to merge conflicts when multiple features touch it
- A cognitive burden when adding new features

## Goal

Split into focused, single-responsibility hooks that compose cleanly, reducing the main controller to ~300 lines of orchestration.

## Constraints

1. **Preserve existing behavior** - No functional changes
2. **Preserve stale-guard patterns** - All `activeBranchScopeRef` checks remain
3. **Preserve telemetry** - All tracking calls remain in place
4. **Follow existing patterns** - Match `useBranchSelectionData` style

## Proposed Structure

```
src/ui/views/branch-view/
├── useBranchViewController.ts      (~300 lines, orchestrator)
├── useBranchSelectionData.ts       (existing, unchanged)
├── useBranchNarrativeState.ts      (~180 lines, new)
├── useBranchFeedbackState.ts       (~100 lines, new)
├── useBranchAskWhyState.ts         (~90 lines, new)
└── useBranchTelemetry.ts           (~70 lines, new)
```

---

## Phase 1: Extract `useBranchNarrativeState`

**What it owns:**
- `detailLevel`, `setDetailLevel`
- `audience`, `setAudience`
- `feedbackActorRole`, `setFeedbackActorRole`
- `narrativeCalibration`, `setNarrativeCalibration`
- `githubContext`, `setGithubContext`
- `observability`, `setObservability`, `bumpObservability`
- Derived: `narrative`, `recallLaneItems`, `projections`, `archaeologyEntries`, `rolloutReport`
- Derived: `killSwitchActive`, `effectiveDetailLevel`, `criticalRule`

**What it does NOT own:**
- Ask-why state (separate hook)
- Selected node (stays in main controller)
- Telemetry calls (passed as callbacks or extracted separately)

**Signature:**
```typescript
type UseBranchNarrativeStateInput = {
  model: BranchViewModel;
  calibrationEnabled: boolean;
  githubConnectorEnabled: boolean;
  branchScopeKey: string;
  killSwitchActive: boolean;
};

type UseBranchNarrativeStateOutput = {
  // State
  detailLevel: NarrativeDetailLevel;
  audience: StakeholderAudience;
  feedbackActorRole: NarrativeFeedbackActorRole;
  narrativeCalibration: NarrativeCalibrationProfile | null;
  githubContext: GitHubContextState;
  observability: NarrativeObservabilityMetrics;

  // Derived
  narrative: BranchNarrative;
  recallLaneItems: NarrativeRecallLaneItem[];
  projections: StakeholderProjections;
  archaeologyEntries: DecisionArchaeologyEntry[];
  rolloutReport: RolloutReport;
  effectiveDetailLevel: NarrativeDetailLevel;
  killSwitchActive: boolean;
  criticalRule: RolloutRule | undefined;

  // Actions
  setDetailLevel: (level: NarrativeDetailLevel) => void;
  setAudience: (audience: StakeholderAudience) => void;
  setFeedbackActorRole: (role: NarrativeFeedbackActorRole) => void;
  bumpObservability: (kind: keyof Omit<NarrativeObservabilityMetrics, 'lastEventAtISO'>) => void;
};
```

**Lines extracted:** ~180 lines (state declarations + useMemo derivations + github context effect + calibration effect)

---

## Phase 2: Extract `useBranchFeedbackState`

**What it owns:**
- `handleSubmitFeedback` callback
- `handleFeedbackRoleChange` callback
- `handleAudienceChange` callback (with telemetry)

**Signature:**
```typescript
type UseBranchFeedbackStateInput = {
  repoId: number | null;
  branchName: string | undefined;
  narrative: BranchNarrative;
  effectiveDetailLevel: NarrativeDetailLevel;
  calibrationEnabled: boolean;
  feedbackContextKey: string;
  setActionError: (error: string | null) => void;
  setNarrativeCalibration: (profile: NarrativeCalibrationProfile | null) => void;
  narrativeViewInstanceId: string | null;
};

type UseBranchFeedbackStateOutput = {
  feedbackActorRole: NarrativeFeedbackActorRole;
  setFeedbackActorRole: (role: NarrativeFeedbackActorRole) => void;
  handleSubmitFeedback: (feedback: NarrativeFeedbackAction) => Promise<void>;
  handleFeedbackRoleChange: (role: NarrativeFeedbackActorRole) => void;
};
```

**Lines extracted:** ~50 lines

---

## Phase 3: Extract `useBranchAskWhyState`

**What it owns:**
- `askWhyState`, `setAskWhyState`
- `askWhyRequestVersionRef`
- `handleSubmitAskWhy` callback
- `handleOpenAskWhyCitation` callback

**Signature:**
```typescript
type UseBranchAskWhyStateInput = {
  narrative: BranchNarrative;
  branchScopeKey: string;
  branchName: string | undefined;
  repoId: number | null;
  activeBranchScopeRef: React.MutableRefObject<string | null>;
  isMountedRef: React.MutableRefObject<boolean>;
  handleOpenEvidence: (link: NarrativeEvidenceLink) => void;
};

type UseBranchAskWhyStateOutput = {
  askWhyState: AskWhyState;
  handleSubmitAskWhy: (question: string) => Promise<void>;
  handleOpenAskWhyCitation: (citation: AskWhyCitation) => void;
};
```

**Lines extracted:** ~90 lines

---

## Phase 4: Extract `useBranchTelemetry`

**What it owns:**
- `rolloutTelemetryKeyRef`
- `headerDecisionTelemetryKeyRef`
- `headerDerivationDurationMsRef`
- `narrativeViewedKeyRef`
- `narrativeViewInstanceIdRef`
- `killSwitchReasonRef`
- All `trackNarrativeEvent`, `trackQualityRenderDecision` calls

**Signature:**
```typescript
type UseBranchTelemetryInput = {
  model: BranchViewModel;
  headerViewModel: BranchHeaderViewModel;
  headerReasonCode: HeaderQualityReasonCode;
  narrative: BranchNarrative;
  rolloutReport: RolloutReport;
  killSwitchActive: boolean;
  criticalRule: RolloutRule | undefined;
  effectiveDetailLevel: NarrativeDetailLevel;
  requestIdentityKey: string;
  repoId: number | null;
  bumpObservability: () => void;
};

type UseBranchTelemetryOutput = {
  narrativeViewInstanceId: string | null;
  // No public outputs - hook manages side effects internally
};
```

**Lines extracted:** ~70 lines

---

## Phase 5: Simplify Main Controller

After extractions, `useBranchViewController.ts` contains:
- Props destructuring (~50 lines)
- Selection state management (~100 lines)
- Firefly integration (~20 lines)
- Test run loading (~40 lines)
- Event handlers that remain (node selection, file clicks, etc.) (~60 lines)
- Props assembly (~30 lines)

**Target: ~300 lines**

---

## Migration Strategy

1. **Create hooks one at a time** - Each extraction is a separate commit
2. **Test after each extraction** - Run `pnpm test` to verify no regressions
3. **Keep shared refs in main controller** - `activeBranchScopeRef`, `isMountedRef`, `feedbackContextRef` are passed to child hooks
4. **Preserve dependency arrays** - Copy deps exactly when moving useEffects
5. **Start with most isolated code** - Ask-why has cleanest boundaries, do it first

## Recommended Order

**Revised order based on isolation level:**
1. **Phase 3: Ask-Why State** - Most isolated, clean boundaries, recently added
2. **Phase 4: Telemetry** - Read-only side effects, no state dependencies
3. **Phase 1: Narrative State** - Most complex, many interdependencies
4. **Phase 2: Feedback State** - Depends on narrative state
5. **Phase 5: Simplify** - Final cleanup

## Acceptance Criteria

- [ ] `useBranchViewController.ts` is under 350 lines
- [ ] All existing tests pass
- [ ] No behavioral changes
- [ ] Each new hook has a single responsibility
- [ ] Stale-guard patterns preserved in all async handlers

## Rollback

If issues arise, revert commits in reverse order (Phase 5 → 4 → 3 → 2 → 1).

---

## Estimated Effort

| Phase | Time | Risk |
|-------|------|------|
| Phase 1: Narrative State | 45 min | Low |
| Phase 2: Feedback State | 20 min | Low |
| Phase 3: Ask-Why State | 30 min | Low |
| Phase 4: Telemetry | 30 min | Medium (many effects) |
| Phase 5: Simplify | 15 min | Low |
| **Total** | **~2.5 hours** | |
