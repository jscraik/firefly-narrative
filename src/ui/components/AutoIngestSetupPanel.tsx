import { useEffect, useState } from 'react';
import type { IngestConfig, OtlpEnvStatus } from '../../core/tauri/ingestConfig';

export function AutoIngestSetupPanel(props: {
  config: IngestConfig | null;
  otlpEnv: OtlpEnvStatus | null;
  onToggleAutoIngest: (enabled: boolean) => void;
  onUpdateWatchPaths: (paths: { claude: string[]; cursor: string[] }) => void;
  onConfigureCodex: () => void;
  onGrantConsent: () => void;
}) {
  const { config, otlpEnv, onToggleAutoIngest, onUpdateWatchPaths, onConfigureCodex, onGrantConsent } = props;
  const [claudePaths, setClaudePaths] = useState('');
  const [cursorPaths, setCursorPaths] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!config) return;
    setClaudePaths(config.watchPaths.claude.join('\n'));
    setCursorPaths(config.watchPaths.cursor.join('\n'));
  }, [config]);

  if (!config) {
    return (
      <div className="card p-5">
        <div className="section-header">AUTO‑INGEST SETUP</div>
        <div className="section-subheader mt-0.5">connect once</div>
        <div className="mt-3 text-xs text-stone-500">Open a repo to configure auto‑ingest.</div>
      </div>
    );
  }

  const hasConsent = config.consent.codexTelemetryGranted;
  const envPresent = otlpEnv?.present ?? false;
  const envVarName = otlpEnv?.keyName ?? 'NARRATIVE_OTEL_API_KEY';

  const generateKey = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const next = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    setGeneratedKey(next);
    setCopied(false);
  };

  const exportCommand = generatedKey ? `export ${envVarName}="${generatedKey}"` : '';

  const handleCopyExport = async () => {
    if (!exportCommand) return;
    try {
      await navigator.clipboard.writeText(exportCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="section-header">AUTO‑INGEST SETUP</div>
      <div className="section-subheader mt-0.5">connect once</div>

      <div className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-200"
            checked={config.autoIngestEnabled}
            onChange={(event) => onToggleAutoIngest(event.target.checked)}
          />
          Enable auto‑ingest
        </label>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="text-xs font-semibold text-stone-600">Claude paths (one per line)</div>
          <textarea
            className="mt-2 w-full rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-700"
            rows={3}
            value={claudePaths}
            onChange={(event) => setClaudePaths(event.target.value)}
          />
          <div className="mt-2 text-xs font-semibold text-stone-600">Cursor paths (one per line)</div>
          <textarea
            className="mt-2 w-full rounded-md border border-stone-200 bg-white p-2 text-xs text-stone-700"
            rows={3}
            value={cursorPaths}
            onChange={(event) => setCursorPaths(event.target.value)}
          />
          <button
            type="button"
            className="mt-2 inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
            onClick={() => {
              const next = {
                claude: claudePaths.split(/\r?\n/).map((p) => p.trim()).filter(Boolean),
                cursor: cursorPaths.split(/\r?\n/).map((p) => p.trim()).filter(Boolean)
              };
              onUpdateWatchPaths(next);
            }}
          >
            Save watch paths
          </button>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <div className="text-xs font-semibold text-stone-600">Codex telemetry</div>
          <div className="text-[11px] text-stone-500 mt-1">
            Requires local OTLP receiver and an API key in the environment.
          </div>

          {!hasConsent ? (
            <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-200"
                checked={false}
                onChange={onGrantConsent}
              />
              I consent to enabling Codex telemetry export
            </label>
          ) : (
            <div className="mt-2 text-xs text-emerald-700">Consent granted</div>
          )}

          <div className="mt-2 text-[11px] text-stone-500">
            Env var: <span className="font-mono">{envVarName}</span>
          </div>
          {!envPresent ? (
            <div className="mt-1 text-[11px] text-amber-700">
              Missing env var. Paste the command below in your terminal, then restart Narrative.
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-emerald-700">Env var detected.</div>
          )}

          <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-600">
            <div className="font-semibold">Need a key?</div>
            <div className="mt-1">
              We can generate a local key, but we can’t set it in your system automatically.
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={generateKey}
                className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
              >
                Generate key
              </button>
              <button
                type="button"
                onClick={handleCopyExport}
                disabled={!generatedKey}
                className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
              >
                {copied ? 'Copied' : 'Copy export command'}
              </button>
            </div>
            <div className="mt-2 font-mono text-[11px] text-stone-500">
              {exportCommand || `export ${envVarName}="YOUR_KEY"`}
            </div>
          </div>

          <button
            type="button"
            className="mt-2 inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
            onClick={onConfigureCodex}
            disabled={!hasConsent}
          >
            Configure Codex telemetry
          </button>
        </div>
      </div>
    </div>
  );
}
