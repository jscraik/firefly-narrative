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

        {discoveredSummary && (
          <div className="text-[11px] text-text-tertiary">{discoveredSummary}</div>
        )}

        <div className="rounded-lg border border-border-light bg-bg-subtle p-3">
          <label htmlFor="claude-paths" className="text-xs font-semibold text-text-secondary">
            Claude paths (one per line)
          </label>
          <textarea
            id="claude-paths"
            className="mt-2 w-full rounded-md border border-border-light bg-bg-card p-2 text-xs text-text-secondary"
            rows={3}
            value={claudePaths}
            onChange={(event) => setClaudePaths(event.target.value)}
          />
          <label htmlFor="cursor-paths" className="mt-2 text-xs font-semibold text-text-secondary">
            Cursor paths (one per line)
          </label>
          <textarea
            id="cursor-paths"
            className="mt-2 w-full rounded-md border border-border-light bg-bg-card p-2 text-xs text-text-secondary"
            rows={3}
            value={cursorPaths}
            onChange={(event) => setCursorPaths(event.target.value)}
          />
          <label htmlFor="codex-log-paths" className="mt-2 text-xs font-semibold text-text-secondary">
            Codex paths (one per line)
          </label>
          <textarea
            id="codex-log-paths"
            className="mt-2 w-full rounded-md border border-border-light bg-bg-card p-2 text-xs text-text-secondary"
            rows={2}
            value={codexPaths}
            onChange={(event) => setCodexPaths(event.target.value)}
          />
          <div className="mt-1 text-[11px] text-text-tertiary">
            Recommended: <span className="font-mono">~/.codex/sessions</span> and{' '}
            <span className="font-mono">~/.codex/archived_sessions</span>. Optional: <span className="font-mono">~/.codex/history.jsonl</span>{' '}
            (index) and <span className="font-mono">~/.codex/logs</span> (legacy fallback).
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-border-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
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
              className="inline-flex items-center rounded-md border border-border-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
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
              className="inline-flex items-center rounded-md border border-border-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
              onClick={async () => {
                const dir = await pickDir();
                if (!dir) return;
                setCodexPaths((prev) => (prev.trim() ? `${prev}\n${dir}` : dir));
              }}
            >
              Add Codex folder…
            </button>
          </div>
          <button
            type="button"
            className="mt-2 inline-flex items-center rounded-md border border-accent-blue-light bg-accent-blue-bg px-2 py-1 text-[11px] font-semibold text-accent-blue hover:bg-accent-blue-light"
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
        </div>

        <div className="rounded-lg border border-border-light bg-bg-card p-3">
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
            className="mt-2 ml-2 inline-flex items-center rounded-md border border-border-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
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
