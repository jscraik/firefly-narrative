import { useCallback, useMemo, useState } from 'react';
import type { ActivityEvent } from '../../core/tauri/activity';

function formatTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return '—';
  }
}

export function CaptureActivityStrip(props: {
  enabled: boolean;
  sourcesLabel: string;
  issueCount: number;
  lastSeenISO?: string;
  recent: ActivityEvent[];
  onToggle?: (enabled: boolean) => void;
  onRequestAll?: () => Promise<ActivityEvent[]>;
}) {
  const { enabled, sourcesLabel, issueCount, lastSeenISO, recent, onToggle, onRequestAll } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItems, setDrawerItems] = useState<ActivityEvent[] | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const lastSeen = useMemo(() => formatTime(lastSeenISO), [lastSeenISO]);

  const openDrawer = useCallback(async () => {
    setDrawerOpen(true);
    if (!onRequestAll) return;
    setDrawerLoading(true);
    try {
      const items = await onRequestAll();
      setDrawerItems(items);
    } finally {
      setDrawerLoading(false);
    }
  }, [onRequestAll]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  return (
    <>
      <div className="card p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-text-secondary">CAPTURE</div>
            <div className="text-[11px] text-text-tertiary mt-0.5">
              {enabled
                ? `On · Sources: ${sourcesLabel || '—'} · Issues: ${issueCount}`
                : 'Off · Turn on to capture sessions and traces automatically.'}
            </div>
            {enabled ? (
              <div className="text-[11px] text-text-muted">Last seen: {lastSeen}</div>
            ) : null}
          </div>

          {onToggle ? (
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-light text-sky-600 focus:ring-sky-200"
                checked={enabled}
                onChange={(event) => onToggle(event.target.checked)}
              />
              Auto‑capture
            </label>
          ) : null}
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-text-secondary">RECENT</div>
            <button
              type="button"
              className="text-[11px] text-text-tertiary hover:text-text-secondary"
              onClick={openDrawer}
              disabled={!onRequestAll}
            >
              View all
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="mt-2 text-xs text-text-tertiary">No recent capture activity yet.</div>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5">
              {recent.slice(0, 3).map((e) => (
                <div key={e.id} className="text-[11px] text-text-tertiary">
                  {e.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={closeDrawer}
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-bg-page shadow-xl border-l border-border-light p-5 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text-secondary">Capture activity</div>
                <div className="mt-1 text-xs text-text-tertiary">
                  Recent imports and telemetry updates for this repo.
                </div>
              </div>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-md bg-bg-hover text-text-secondary hover:bg-border-light"
                onClick={closeDrawer}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {drawerLoading ? (
                <div className="text-xs text-text-tertiary">Loading…</div>
              ) : (drawerItems ?? []).length === 0 ? (
                <div className="text-sm text-text-tertiary">
                  Nothing captured yet. Turn on Auto‑capture to start.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(drawerItems ?? []).map((e) => (
                    <div key={e.id} className="card p-3">
                      <div className="text-xs text-text-secondary">{e.message}</div>
                      <div className="mt-1 text-[11px] text-text-tertiary">
                        {formatTime(e.createdAtIso)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
