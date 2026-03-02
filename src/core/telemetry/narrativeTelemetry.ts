export type NarrativeTelemetrySchemaVersion = 'v1';

export type NarrativeTelemetryEventName =
  | 'narrative_viewed'
  | 'layer_switched'
  | 'audience_switched'
  | 'evidence_opened'
  | 'fallback_used'
  | 'feedback_submitted'
  | 'rollout_scored'
  | 'kill_switch_triggered'
  | 'ui.quality.render_decision';

// ============================================================================
// Ask-Why Telemetry Events
// ============================================================================

import type {
  AskWhyConfidenceBand,
  AskWhyCitationType,
  AskWhyFallbackReasonCode,
} from '../types';

export type AskWhyTelemetryEventName =
  | 'ask_why_submitted'
  | 'ask_why_answer_viewed'
  | 'ask_why_evidence_opened'
  | 'ask_why_fallback_used'
  | 'ask_why_error';

// Re-export types for convenience
export type { AskWhyConfidenceBand, AskWhyCitationType, AskWhyFallbackReasonCode };

export type AskWhyTelemetryPayload = {
  queryId: string;
  branchId?: string;
  questionHash?: string;
  confidence?: AskWhyConfidenceBand;
  citationCount?: number;
  citationType?: AskWhyCitationType;
  citationId?: string;
  fallbackUsed?: boolean;
  reasonCode?: AskWhyFallbackReasonCode;
  errorType?: string;
};

// Combined telemetry event names for dispatch
export type NarrativeTelemetryEventNameAll =
  | NarrativeTelemetryEventName
  | AskWhyTelemetryEventName;

// Telemetry event structure
type NarrativeTelemetryEventDetail = {
  schemaVersion: NarrativeTelemetrySchemaVersion;
  event: NarrativeTelemetryEventNameAll;
  payload: NarrativeTelemetryPayload | AskWhyTelemetryPayload;
  atISO: string;
};

declare global {
  interface WindowEventMap {
    'narrative:telemetry': CustomEvent<NarrativeTelemetryEventDetail>;
  }
}

// ============================================================================
// Narrative Telemetry Types
// ============================================================================

type NarrativeEvidenceSource = 'demo' | 'git' | 'recall_lane';

export type NarrativeHeaderKind = 'hidden' | 'shell' | 'full';
export type NarrativeRepoStatus = 'idle' | 'loading' | 'ready' | 'error';
export type NarrativeTransitionType = 'initial' | 'state_change';

export type HeaderQualityReasonCode =
  | 'mode_unsupported'
  | 'repo_idle'
  | 'model_missing'
  | 'feature_disabled'
  | 'loading'
  | 'error'
  | 'ready'
  | 'unknown';

export type NarrativeTelemetryPayload = {
  schemaVersion?: NarrativeTelemetrySchemaVersion;
  branch?: string;
  viewInstanceId?: string;
  source?: NarrativeEvidenceSource;
  detailLevel?: 'summary' | 'evidence' | 'diff';
  audience?: 'executive' | 'manager' | 'engineer';
  evidenceKind?: 'commit' | 'session' | 'file' | 'diff';
  confidence?: number;
  rolloutStatus?: 'healthy' | 'watch' | 'rollback';
  score?: number;
  reason?: string;
  reasonCode?: HeaderQualityReasonCode;
  headerKind?: NarrativeHeaderKind;
  repoStatus?: NarrativeRepoStatus;
  transition?: NarrativeTransitionType;
  durationMs?: number;
  budgetMs?: number;
  overBudget?: boolean;
  feedbackType?: 'highlight_key' | 'highlight_wrong' | 'branch_missing_decision';
  feedbackTargetKind?: 'highlight' | 'branch';
  feedbackActorRole?: 'developer' | 'reviewer';
  recallLaneItemId?: string;
  recallLaneConfidenceBand?: 'low' | 'medium' | 'high';
};

export type NarrativeRenderDecisionInput = {
  branch?: string;
  source: 'demo' | 'git';
  headerKind: NarrativeHeaderKind;
  repoStatus: NarrativeRepoStatus;
  transition: NarrativeTransitionType;
  reasonCode: HeaderQualityReasonCode;
  durationMs: number;
  budgetMs: number;
};

// ============================================================================
// Utility Functions
// ============================================================================

function sanitizeMs(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 1000) / 1000;
}

// ============================================================================
// Narrative Telemetry Functions
// ============================================================================

export function trackNarrativeEvent(
  event: NarrativeTelemetryEventName,
  payload: NarrativeTelemetryPayload = {}
) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('narrative:telemetry', {
      detail: {
        schemaVersion: 'v1' as NarrativeTelemetrySchemaVersion,
        event,
        payload,
        atISO: new Date().toISOString(),
      },
    })
  );
}

export function trackQualityRenderDecision(input: NarrativeRenderDecisionInput) {
  const durationMs = sanitizeMs(input.durationMs);
  const budgetMs = sanitizeMs(input.budgetMs);

  trackNarrativeEvent('ui.quality.render_decision', {
    schemaVersion: 'v1',
    branch: input.branch,
    source: input.source,
    headerKind: input.headerKind,
    repoStatus: input.repoStatus,
    transition: input.transition,
    reasonCode: input.reasonCode,
    durationMs,
    budgetMs,
    overBudget: durationMs > budgetMs,
  });
}

// ============================================================================
// Ask-Why Telemetry Tracking Functions
// ============================================================================

function trackAskWhyEvent(
  event: AskWhyTelemetryEventName,
  payload: AskWhyTelemetryPayload
) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('narrative:telemetry', {
      detail: {
        schemaVersion: 'v1' as NarrativeTelemetrySchemaVersion,
        event,
        payload,
        atISO: new Date().toISOString(),
      },
    })
  );
}

export type TrackAskWhySubmittedInput = {
  queryId: string;
  branchId: string;
  questionHash: string;
};

export function trackAskWhySubmitted(input: TrackAskWhySubmittedInput) {
  trackAskWhyEvent('ask_why_submitted', {
    queryId: input.queryId,
    branchId: input.branchId,
    questionHash: input.questionHash,
  });
}

export type TrackAskWhyAnswerViewedInput = {
  queryId: string;
  confidence: AskWhyConfidenceBand;
  citationCount: number;
  fallbackUsed: boolean;
};

export function trackAskWhyAnswerViewed(input: TrackAskWhyAnswerViewedInput) {
  trackAskWhyEvent('ask_why_answer_viewed', {
    queryId: input.queryId,
    confidence: input.confidence,
    citationCount: input.citationCount,
    fallbackUsed: input.fallbackUsed,
  });
}

export type TrackAskWhyEvidenceOpenedInput = {
  queryId: string;
  citationType: AskWhyCitationType;
  citationId: string;
};

export function trackAskWhyEvidenceOpened(input: TrackAskWhyEvidenceOpenedInput) {
  trackAskWhyEvent('ask_why_evidence_opened', {
    queryId: input.queryId,
    citationType: input.citationType,
    citationId: input.citationId,
  });
}

export type TrackAskWhyFallbackUsedInput = {
  queryId: string;
  reasonCode: AskWhyFallbackReasonCode;
};

export function trackAskWhyFallbackUsed(input: TrackAskWhyFallbackUsedInput) {
  trackAskWhyEvent('ask_why_fallback_used', {
    queryId: input.queryId,
    reasonCode: input.reasonCode,
    fallbackUsed: true,
  });
}

export type TrackAskWhyErrorInput = {
  queryId: string;
  errorType: string;
};

export function trackAskWhyError(input: TrackAskWhyErrorInput) {
  trackAskWhyEvent('ask_why_error', {
    queryId: input.queryId,
    errorType: input.errorType,
  });
}
