import type { IngestStatus } from '../../hooks/useAutoIngest';

export function IngestStatusStrip(props: {
  status: IngestStatus;
  onToggle?: (enabled: boolean) => void;
}) {
  const { status, onToggle } = props;
  const lastImport = status.lastImportAt
    ? new Date(status.lastImportAt).toLocaleTimeString()
    : '—';

  return (
    <div className="card p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-xs font-semibold text-stone-600">INGESTION STATUS</div>
        <div className="text-[11px] text-stone-500 mt-0.5">
          {status.enabled ? 'On' : 'Off'} · Last import: {lastImport} · Errors: {status.errorCount}
        </div>
        {status.lastSource ? (
          <div className="text-[11px] text-stone-400">Last source: {status.lastSource}</div>
        ) : null}
      </div>
      {onToggle ? (
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-200"
            checked={status.enabled}
            onChange={(event) => onToggle(event.target.checked)}
          />
          Auto‑ingest
        </label>
      ) : null}
    </div>
  );
}
