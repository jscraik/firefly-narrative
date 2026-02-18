export type NarrativeTelemetryEventName = 'layer_switched' | 'evidence_opened' | 'fallback_used';

export type NarrativeTelemetryPayload = {
  branch?: string;
  detailLevel?: 'summary' | 'evidence' | 'diff';
  evidenceKind?: 'commit' | 'session' | 'file' | 'diff';
  confidence?: number;
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
