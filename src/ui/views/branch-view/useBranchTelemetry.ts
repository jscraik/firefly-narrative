import { useEffect, useRef } from 'react';
import { trackNarrativeEvent } from '../../../core/telemetry/narrativeTelemetry';
import type {
  BranchHeaderViewModel,
  BranchNarrative,
  NarrativeKillSwitchRule,
  NarrativeObservabilityMetrics,
  NarrativeRolloutReport,
} from '../../../core/types';
import { createNarrativeViewInstanceId } from '../branchView.constants';

export type UseBranchTelemetryInput = {
  requestIdentityKey: string;
  branchName: string | undefined;
  source: string;
  headerViewModel: BranchHeaderViewModel;
  headerReasonCode: string;
  headerDerivationDurationMs: number;
  repoId: number | null;
  effectiveDetailLevel: string;
  narrative: BranchNarrative;
  rolloutReport: NarrativeRolloutReport;
  killSwitchActive: boolean;
  criticalRule: NarrativeKillSwitchRule | undefined;
  bumpObservability: (kind: keyof Omit<NarrativeObservabilityMetrics, 'lastEventAtISO'>) => void;
  narrativeViewInstanceIdRef: React.MutableRefObject<string | null>;
};

export function useBranchTelemetry(input: UseBranchTelemetryInput): void {
  const {
    requestIdentityKey,
    branchName,
    source,
    headerViewModel,
    headerReasonCode,
    headerDerivationDurationMs,
    repoId,
    effectiveDetailLevel,
    narrative,
    rolloutReport,
    killSwitchActive,
    criticalRule,
    bumpObservability,
    narrativeViewInstanceIdRef,
  } = input;

  const rolloutTelemetryKeyRef = useRef<string | null>(null);
  const killSwitchReasonRef = useRef<string | null>(null);
  const headerDecisionTelemetryKeyRef = useRef<string | null>(null);
  const narrativeViewedKeyRef = useRef<string | null>(null);

  // Header decision telemetry
  useEffect(() => {
    const telemetryKey = `${requestIdentityKey}:${headerViewModel.kind}:${headerReasonCode}`;
    const previousKey = headerDecisionTelemetryKeyRef.current;
    if (previousKey === telemetryKey) return;

    const transition = previousKey ? 'state_change' : 'initial';
    headerDecisionTelemetryKeyRef.current = telemetryKey;

    trackNarrativeEvent('quality_render_decision', {
      branch: branchName,
      source,
      headerKind: headerViewModel.kind,
      repoStatus: 'ready',
      transition,
      reasonCode: headerReasonCode,
      durationMs: headerDerivationDurationMs,
      budgetMs: 1,
    });
  }, [branchName, headerDerivationDurationMs, headerReasonCode, headerViewModel.kind, requestIdentityKey, source]);

  // Narrative viewed telemetry
  useEffect(() => {
    if (!repoId) return;
    const key = `${repoId}:${branchName ?? 'unknown'}`;
    if (narrativeViewedKeyRef.current === key) return;
    narrativeViewedKeyRef.current = key;

    const viewInstanceId = createNarrativeViewInstanceId(repoId, branchName);
    narrativeViewInstanceIdRef.current = viewInstanceId;

    trackNarrativeEvent('narrative_viewed', {
      branch: branchName,
      detailLevel: effectiveDetailLevel,
      confidence: narrative.confidence,
      viewInstanceId,
    });
  }, [branchName, effectiveDetailLevel, narrative.confidence, narrativeViewInstanceIdRef, repoId]);

  // Rollout scored telemetry
  useEffect(() => {
    const key = `${branchName ?? 'unknown'}:${rolloutReport.status}:${rolloutReport.averageScore}`;
    if (rolloutTelemetryKeyRef.current === key) return;
    rolloutTelemetryKeyRef.current = key;

    trackNarrativeEvent('rollout_scored', {
      branch: branchName,
      confidence: narrative.confidence,
      rolloutStatus: rolloutReport.status,
      score: rolloutReport.averageScore,
    });
  }, [branchName, narrative.confidence, rolloutReport.averageScore, rolloutReport.status]);

  // Kill switch triggered telemetry
  useEffect(() => {
    if (!killSwitchActive) {
      killSwitchReasonRef.current = null;
      return;
    }

    const reason = criticalRule?.id ?? 'rollback_guard';
    if (killSwitchReasonRef.current === reason) return;
    killSwitchReasonRef.current = reason;
    bumpObservability('killSwitchTriggeredCount');

    trackNarrativeEvent('kill_switch_triggered', {
      branch: branchName,
      confidence: narrative.confidence,
      rolloutStatus: rolloutReport.status,
      reason,
    });
  }, [
    bumpObservability,
    branchName,
    criticalRule?.id,
    killSwitchActive,
    narrative.confidence,
    rolloutReport.status,
  ]);
}
