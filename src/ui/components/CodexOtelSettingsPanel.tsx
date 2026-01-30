import { useEffect, useState } from "react";
import type { TraceCollectorConfig } from "../../core/types";

export function CodexOtelSettingsPanel(props: {
  traceConfig?: TraceCollectorConfig;
  onUpdateCodexOtelPath?: (path: string) => void;
  onToggleCodexOtelReceiver?: (enabled: boolean) => void;
  onOpenCodexOtelDocs?: () => void;
  logUserPromptEnabled?: boolean | null;
  logUserPromptConfigPath?: string | null;
}) {
  const {
    traceConfig,
    onUpdateCodexOtelPath,
    onToggleCodexOtelReceiver,
    onOpenCodexOtelDocs,
    logUserPromptEnabled,
    logUserPromptConfigPath
  } = props;
  const [otelPath, setOtelPath] = useState(traceConfig?.codexOtelLogPath ?? "/tmp/codex-otel.json");

  useEffect(() => {
    if (!traceConfig?.codexOtelLogPath) return;
    setOtelPath(traceConfig.codexOtelLogPath);
  }, [traceConfig?.codexOtelLogPath]);

  const receiverEnabled = traceConfig?.codexOtelReceiverEnabled ?? false;

  if (!traceConfig) {
    return (
      <div className="card p-5">
        <div className="section-header">CODEX OTEL SETTINGS</div>
        <div className="section-subheader mt-0.5">telemetry inputs</div>
        <div className="mt-4 text-xs text-stone-500">Open a repo to configure Codex OTel settings.</div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="section-header">CODEX OTEL SETTINGS</div>
          <div className="section-subheader mt-0.5">telemetry inputs</div>
        </div>
        {onOpenCodexOtelDocs ? (
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 transition-all duration-150 hover:bg-sky-100"
            onClick={onOpenCodexOtelDocs}
            aria-label="Open Codex OTel setup guide"
          >
            Open Codex OTel setup guide
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
        <div className="text-xs font-semibold text-stone-600">Codex OTel log file path</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={otelPath}
            onChange={(event) => setOtelPath(event.target.value)}
            className="min-w-[220px] flex-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 transition-all duration-150 hover:border-stone-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
            placeholder="/tmp/codex-otel.json"
          />
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              otelPath.trim() && otelPath !== (traceConfig?.codexOtelLogPath ?? "/tmp/codex-otel.json")
                ? "border-sky-500 bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
            }`}
            onClick={() => onUpdateCodexOtelPath?.(otelPath.trim())}
            disabled={!otelPath.trim()}
          >
            Sync
          </button>
        </div>

        {onToggleCodexOtelReceiver ? (
          <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-200"
              checked={receiverEnabled}
              onChange={(event) => onToggleCodexOtelReceiver(event.target.checked)}
            />
            Embedded Codex OTel receiver (local)
          </label>
        ) : null}

        {logUserPromptEnabled ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <div className="font-semibold">Raw prompt export is ON.</div>
            <div>This can include sensitive text.</div>
            {logUserPromptConfigPath ? (
              <div className="mt-1 text-[11px] text-amber-700">Config: {logUserPromptConfigPath}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
