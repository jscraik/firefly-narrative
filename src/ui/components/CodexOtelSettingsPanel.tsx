import { useEffect, useState } from 'react';
import type { AttributionPrefs, AttributionPrefsUpdate } from '../../core/attribution-api';
import type { TraceCollectorConfig } from '../../core/types';
import { Checkbox } from './Checkbox';

export function CodexOtelSettingsPanel(props: {
  traceConfig?: TraceCollectorConfig;
  onUpdateCodexOtelPath?: (path: string) => void;
  onToggleCodexOtelReceiver?: (enabled: boolean) => void;
  onOpenCodexOtelDocs?: () => void;
  logUserPromptEnabled?: boolean | null;
  logUserPromptConfigPath?: string | null;
  attributionPrefs?: AttributionPrefs | null;
  onUpdateAttributionPrefs?: (update: AttributionPrefsUpdate) => void;
  onPurgeAttributionMetadata?: () => void;
}) {
  const {
    traceConfig,
    onUpdateCodexOtelPath,
    onToggleCodexOtelReceiver,
    onOpenCodexOtelDocs,
    logUserPromptEnabled,
    logUserPromptConfigPath,
    attributionPrefs,
    onUpdateAttributionPrefs,
    onPurgeAttributionMetadata
  } = props;
  const [otelPath, setOtelPath] = useState(traceConfig?.codexOtelLogPath ?? '/tmp/codex-otel.json');
  const [retentionDays, setRetentionDays] = useState(
    attributionPrefs?.retentionDays ? String(attributionPrefs.retentionDays) : ''
  );
  const [copiedPromptSnippet, setCopiedPromptSnippet] = useState(false);

  useEffect(() => {
    if (!traceConfig?.codexOtelLogPath) return;
    setOtelPath(traceConfig.codexOtelLogPath);
  }, [traceConfig?.codexOtelLogPath]);

  useEffect(() => {
    setRetentionDays(attributionPrefs?.retentionDays ? String(attributionPrefs.retentionDays) : '');
  }, [attributionPrefs?.retentionDays]);

  const receiverEnabled = traceConfig?.codexOtelReceiverEnabled ?? false;
  const disablePromptSnippet = 'log_user_prompt = false';

  const handleCopyPromptSnippet = async () => {
    try {
      await navigator.clipboard.writeText(disablePromptSnippet);
      setCopiedPromptSnippet(true);
      setTimeout(() => setCopiedPromptSnippet(false), 1500);
    } catch {
      setCopiedPromptSnippet(false);
    }
  };

  if (!traceConfig) {
    return (
      <div className="card p-5">
        <div className="section-header">CODEX OTEL SETTINGS</div>
        <div className="section-subheader">telemetry inputs</div>
        <div className="mt-4 text-xs text-text-tertiary">Open a repo to configure Codex OTel settings.</div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-header">CODEX OTEL SETTINGS</div>
          <div className="section-subheader">telemetry inputs</div>
        </div>
        {onOpenCodexOtelDocs ? (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-accent-blue-light bg-accent-blue-bg px-2.5 py-1 text-[11px] font-semibold text-accent-blue transition-colors hover:bg-accent-blue-light"
            onClick={onOpenCodexOtelDocs}
            aria-label="Open Codex OTel setup guide"
          >
            Open Codex OTel setup guide
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border-light bg-bg-subtle p-3">
        <label htmlFor="codex-otel-path" className="text-xs font-semibold text-text-secondary">
          Codex OTel log file path
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="codex-otel-path"
            type="text"
            value={otelPath}
            onChange={(event) => setOtelPath(event.target.value)}
            className="min-w-[220px] flex-1 rounded-md border border-border-light bg-bg-card px-2 py-1 text-xs text-text-secondary outline-none focus:border-border-medium"
            placeholder="/tmp/codex-otel.json"
          />
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              otelPath.trim() && otelPath !== (traceConfig?.codexOtelLogPath ?? '/tmp/codex-otel.json')
                ? 'border-accent-blue-light bg-accent-blue-bg text-accent-blue hover:bg-accent-blue-light'
                : 'border-border-light bg-bg-card text-text-secondary hover:bg-bg-hover'
            }`}
            onClick={() => onUpdateCodexOtelPath?.(otelPath.trim())}
            disabled={!otelPath.trim()}
          >
            Sync
          </button>
        </div>

        {onToggleCodexOtelReceiver ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
            <Checkbox checked={receiverEnabled} onCheckedChange={(c) => onToggleCodexOtelReceiver(c)} aria-label="Embedded Codex OTel receiver (local)" />
            Embedded Codex OTel receiver (local)
          </div>
        ) : null}

        {logUserPromptEnabled ? (
          <div className="mt-3 rounded-md border border-accent-amber-light bg-accent-amber-bg px-3 py-2 text-xs text-text-secondary">
            <div className="font-semibold text-accent-amber">Raw prompt export is ON.</div>
            <div>This means full prompt text is being sent and may include sensitive data.</div>
            {logUserPromptConfigPath ? (
              <div className="mt-1 text-[11px] text-text-secondary">Config: {logUserPromptConfigPath}</div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPromptSnippet}
                className="inline-flex items-center rounded-md border border-accent-amber-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light"
              >
                {copiedPromptSnippet ? 'Snippet copied' : 'Copy disable snippet'}
              </button>
              <span className="font-mono text-[11px] text-text-secondary">{disablePromptSnippet}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border-light bg-bg-card p-4">
        <div>
          <div className="text-xs font-semibold text-text-secondary">Attribution Notes</div>
          <div className="text-[11px] text-text-muted">
            Control attribution metadata caching and Source Lens overlays for this repo.
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Checkbox
            checked={attributionPrefs?.cachePromptMetadata ?? false}
            onCheckedChange={(c) => onUpdateAttributionPrefs?.({ cachePromptMetadata: c })}
            aria-label="Cache prompt metadata locally"
          />
          Cache prompt metadata locally
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Checkbox
            checked={attributionPrefs?.storePromptText ?? false}
            onCheckedChange={(c) => onUpdateAttributionPrefs?.({ storePromptText: c })}
            aria-label="Store prompt text"
          />
          Store prompt text (may include sensitive data)
        </div>

        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Checkbox
            checked={attributionPrefs?.showLineOverlays ?? true}
            onCheckedChange={(c) => onUpdateAttributionPrefs?.({ showLineOverlays: c })}
            aria-label="Show line overlays"
          />
          Show line overlays in Source Lens
        </div>

        <label htmlFor="codex-otel-retention" className="text-xs font-semibold text-text-secondary">
          Retention days
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="codex-otel-retention"
            type="number"
            min={1}
            value={retentionDays}
            onChange={(event) => setRetentionDays(event.target.value)}
            className="w-24 rounded-md border border-border-light bg-bg-card px-2 py-1 text-xs text-text-secondary"
            placeholder="Days"
          />
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-border-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
            onClick={() => {
              const trimmed = retentionDays.trim();
              if (!trimmed) {
                onUpdateAttributionPrefs?.({ clearRetentionDays: true });
                return;
              }
              const parsed = Number.parseInt(trimmed, 10);
              if (Number.isFinite(parsed) && parsed > 0) {
                onUpdateAttributionPrefs?.({ retentionDays: parsed });
              }
            }}
          >
            Save retention
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-accent-amber-light bg-accent-amber-bg px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light"
            onClick={onPurgeAttributionMetadata}
          >
            Purge cached prompts
          </button>
        </div>
      </div>
    </div>
  );
}
