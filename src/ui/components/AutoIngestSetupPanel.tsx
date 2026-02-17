import { useEffect, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { DiscoveredSources, IngestConfig, OtlpKeyStatus } from '../../core/tauri/ingestConfig';
import { Checkbox } from './Checkbox';

export function AutoIngestSetupPanel(props: {
  config: IngestConfig | null;
  otlpKey: OtlpKeyStatus | null;
  sources: DiscoveredSources | null;
  onToggleAutoIngest: (enabled: boolean) => void;
  onUpdateWatchPaths: (paths: { claude: string[]; cursor: string[]; codexLogs: string[] }) => void;
  onConfigureCodex: () => void;
  onRotateOtlpKey: () => void;
  onGrantConsent: () => void;
}) {
  const { config, otlpKey, sources, onToggleAutoIngest, onUpdateWatchPaths, onConfigureCodex, onRotateOtlpKey, onGrantConsent } =
    props;
  const [claudePaths, setClaudePaths] = useState('');
  const [cursorPaths, setCursorPaths] = useState('');
  const [codexPaths, setCodexPaths] = useState('');
  const [showAdvancedPaths, setShowAdvancedPaths] = useState(false);

  useEffect(() => {
    if (!config) return;
    setClaudePaths(config.watchPaths.claude.join('\n'));
    setCursorPaths(config.watchPaths.cursor.join('\n'));
    setCodexPaths((config.watchPaths.codexLogs ?? []).join('\n'));
  }, [config]);

  const discoveredSummary = (() => {
    if (!sources) return null;
    const items: string[] = [];
    if (sources.claude.length > 0) items.push('Claude');
    if (sources.cursor.length > 0) items.push('Cursor');
    if (sources.codexLogs.length > 0) items.push('Codex');
    return items.length > 0 ? `Detected: ${items.join(' · ')}` : 'No known sources detected on this machine.';
  })();

  if (!config) {
    return (
      <div className="card p-5">
        <div className="section-header">AUTO‑INGEST SETUP</div>
        <div className="section-subheader">connect once</div>
        <div className="mt-3 text-xs text-text-tertiary">Open a repo to configure auto‑ingest.</div>
      </div>
    );
  }

  const hasConsent = config.consent.codexTelemetryGranted;
  const keyPresent = otlpKey?.present ?? false;
  const maskedKey = otlpKey?.maskedPreview ?? (keyPresent ? '********' : null);

  const pickDir = async () => {
    const selected = await open({ directory: true, multiple: false, title: 'Choose a folder to capture from' });
    if (!selected) return null;
    return typeof selected === 'string' ? selected : selected[0] ?? null;
  };

  return (
    <div className="card p-5">
      <div className="section-header">AUTO‑INGEST SETUP</div>
      <div className="section-subheader mt-0.5">connect once</div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Checkbox
            checked={config.autoIngestEnabled}
            onCheckedChange={(c) => onToggleAutoIngest(c)}
            aria-label="Enable auto-ingest"
          />
          Enable auto‑ingest
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                config.autoIngestEnabled
                  ? 'bg-accent-green-bg text-accent-green border border-accent-green-light'
                  : 'bg-bg-tertiary text-text-tertiary border border-border-subtle'
              }`}
            >
              {config.autoIngestEnabled ? 'Auto-ingest: ON' : 'Auto-ingest: OFF'}
            </span>
            {discoveredSummary ? (
              <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-tertiary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                {discoveredSummary}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-[11px] text-text-tertiary">
            Add source folders quickly, then save watch paths. Open advanced editor only if you need manual path tuning.
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-tertiary p-3">
          <div className="text-xs font-semibold text-text-secondary">Watch paths</div>
          <div className="mt-1 text-[11px] text-text-tertiary">
            Recommended: <span className="font-mono">~/.codex/sessions</span> and{' '}
            <span className="font-mono">~/.codex/archived_sessions</span>. Optional: <span className="font-mono">~/.codex/history.jsonl</span>{' '}
            (index) and <span className="font-mono">~/.codex/logs</span> (legacy fallback).
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold"
              onClick={async () => {
                const dir = await pickDir();
                if (!dir) return;
                setClaudePaths((prev) => (prev.trim() ? `${prev}\n${dir}` : dir));
              }}
            >
              Add Claude folder…
            </button>
            <button
              type="button"
              className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold"
              onClick={async () => {
                const dir = await pickDir();
                if (!dir) return;
                setCursorPaths((prev) => (prev.trim() ? `${prev}\n${dir}` : dir));
              }}
            >
              Add Cursor folder…
            </button>
            <button
              type="button"
              className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold"
              onClick={async () => {
                const dir = await pickDir();
                if (!dir) return;
                setCodexPaths((prev) => (prev.trim() ? `${prev}\n${dir}` : dir));
              }}
            >
              Add Codex folder…
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-accent-blue-light bg-accent-blue-bg px-2 py-1 text-[11px] font-semibold text-accent-blue hover:bg-accent-blue-light"
              onClick={() => {
                const next = {
                  claude: claudePaths.split(/\r?\n/).map((p) => p.trim()).filter(Boolean),
                  cursor: cursorPaths.split(/\r?\n/).map((p) => p.trim()).filter(Boolean),
                  codexLogs: codexPaths.split(/\r?\n/).map((p) => p.trim()).filter(Boolean),
                };
                onUpdateWatchPaths(next);
              }}
            >
              Save watch paths
            </button>
            <button
              type="button"
              className="btn-secondary-soft inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold"
              onClick={() => setShowAdvancedPaths((v) => !v)}
            >
              {showAdvancedPaths ? 'Hide advanced editor' : 'Show advanced editor'}
            </button>
          </div>

          {showAdvancedPaths && (
            <div className="mt-3 space-y-2 rounded-md border border-border-subtle bg-bg-secondary p-2">
              <label htmlFor="claude-paths" className="text-xs font-semibold text-text-secondary">
                Claude paths (one per line)
              </label>
              <textarea
                id="claude-paths"
                className="mt-1 w-full rounded-md border border-border-subtle bg-bg-tertiary p-2 text-xs text-text-secondary"
                rows={3}
                value={claudePaths}
                onChange={(event) => setClaudePaths(event.target.value)}
              />
              <label htmlFor="cursor-paths" className="text-xs font-semibold text-text-secondary">
                Cursor paths (one per line)
              </label>
              <textarea
                id="cursor-paths"
                className="mt-1 w-full rounded-md border border-border-subtle bg-bg-tertiary p-2 text-xs text-text-secondary"
                rows={3}
                value={cursorPaths}
                onChange={(event) => setCursorPaths(event.target.value)}
              />
              <label htmlFor="codex-log-paths" className="text-xs font-semibold text-text-secondary">
                Codex paths (one per line)
              </label>
              <textarea
                id="codex-log-paths"
                className="mt-1 w-full rounded-md border border-border-subtle bg-bg-tertiary p-2 text-xs text-text-secondary"
                rows={2}
                value={codexPaths}
                onChange={(event) => setCodexPaths(event.target.value)}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-secondary p-3">
          <div className="text-xs font-semibold text-text-secondary">Codex telemetry</div>
          <div className="text-[11px] text-text-tertiary mt-1">
            Uses a local OTLP receiver with an API key stored securely on this machine.
          </div>

          {!hasConsent ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
              <Checkbox checked={false} onCheckedChange={(_c) => onGrantConsent()} aria-label="Grant Codex telemetry consent" />
              I consent to enabling Codex telemetry export
            </div>
          ) : (
            <div className="mt-2 text-xs text-accent-green">Consent granted</div>
          )}

          <div className="mt-2 text-[11px] text-text-tertiary">
            Receiver key: <span className="font-mono">{maskedKey ?? 'not set'}</span>
          </div>

          <button
            type="button"
            className="mt-2 inline-flex items-center rounded-md border border-accent-blue-light bg-accent-blue-bg px-2 py-1 text-[11px] font-semibold text-accent-blue hover:bg-accent-blue-light disabled:opacity-50"
            onClick={onConfigureCodex}
            disabled={!hasConsent}
          >
            Configure Codex telemetry
          </button>

          <button
            type="button"
            className="btn-secondary-soft mt-2 ml-2 inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
            onClick={onRotateOtlpKey}
            disabled={!hasConsent}
            title="Rotate the local receiver key (you will need to re-configure Codex telemetry afterwards)."
          >
            Rotate key
          </button>
        </div>
      </div>
    </div>
  );
}
