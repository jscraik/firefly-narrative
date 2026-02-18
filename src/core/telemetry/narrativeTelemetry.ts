export type NarrativeTelemetryEventName =
  | 'layer_switched'
  | 'audience_switched'
  | 'evidence_opened'
  | 'fallback_used'
  | 'rollout_scored'
  | 'kill_switch_triggered';

export type NarrativeTelemetryPayload = {
  branch?: string;
  detailLevel?: 'summary' | 'evidence' | 'diff';
  audience?: 'executive' | 'manager' | 'engineer';
  evidenceKind?: 'commit' | 'session' | 'file' | 'diff';
  confidence?: number;
  rolloutStatus?: 'healthy' | 'watch' | 'rollback';
  score?: number;
  reason?: string;
};

export function trackNarrativeEvent(
  event: NarrativeTelemetryEventName,
  payload: NarrativeTelemetryPayload = {}
) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('narrative:telemetry', {
      detail: {
        event,
        payload,
        atISO: new Date().toISOString(),
      },
    })
  );
}
