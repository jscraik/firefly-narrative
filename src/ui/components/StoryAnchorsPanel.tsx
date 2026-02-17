import { useCallback, useEffect, useState } from 'react';
import {
  exportSessionLinkNote,
  getStoryAnchorStatus,
  getRepoHooksStatus,
  importSessionLinkNotesBatch,
  installRepoHooks,
  migrateAttributionNotesRef,
  reconcileAfterRewrite,
  uninstallRepoHooks,
  type StoryAnchorCommitStatus,
} from '../../core/story-anchors-api';

export function StoryAnchorsPanel(props: {
  repoId: number | null;
  repoRoot: string | null;
  selectedCommitSha: string | null;
  indexedCommitShas?: string[] | null;
}) {
  const { repoId, repoRoot, selectedCommitSha, indexedCommitShas } = props;
  const [hookInstalled, setHookInstalled] = useState<boolean | null>(null);
  const [hooksDir, setHooksDir] = useState<string | null>(null);
  const [status, setStatus] = useState<StoryAnchorCommitStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
  const [repoCounts, setRepoCounts] = useState<{
    total: number;
    attribution: number;
    sessions: number;
    lineage: number;
    complete: number;
  } | null>(null);

  const canRun = Boolean(repoId && repoRoot);
  const canRunCommitActions = Boolean(repoId && selectedCommitSha);
  const canRunRepoActions = Boolean(repoId && indexedCommitShas && indexedCommitShas.length > 0);

  const refresh = useCallback(async () => {
    if (!repoId || !repoRoot) return;

    try {
      const res = await getRepoHooksStatus(repoId);
      setHookInstalled(res.installed);
      setHooksDir(res.hooksDir);
    } catch {
      setHookInstalled(null);
      setHooksDir(null);
    }

    if (selectedCommitSha) {
      try {
        const rows = await getStoryAnchorStatus(repoId, [selectedCommitSha]);
        setStatus(rows[0] ?? null);
      } catch {
        setStatus(null);
      }
    } else {
      setStatus(null);
    }
  }, [repoId, repoRoot, selectedCommitSha]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border-light bg-bg-secondary p-4">
      <div>
        <div className="text-xs font-semibold text-text-secondary">Story Anchors</div>
        <div className="text-[11px] text-text-muted">
          Keep attribution + session links attached to commits via Git Notes, and sync automatically via git hooks.
        </div>
      </div>

      {!canRun ? (
        <div className="text-[11px] text-text-muted">Open a repo to manage Story Anchors.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-text-tertiary">
              Hooks: {hookInstalled === null ? 'Unknown' : hookInstalled ? 'Installed' : 'Not installed'}
            </span>
            {hooksDir ? (
              <span className="text-[11px] text-text-muted">
                (<span className="font-mono">{hooksDir}</span>)
              </span>
            ) : null}
            <button
              type="button"
              disabled={busy || !repoId}
              className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              onClick={async () => {
                if (!repoId) return;
                setBusy(true);
                setMessage(null);
                try {
                  await installRepoHooks(repoId);
                  setMessage('Installed repo hooks.');
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                  refresh();
                }
              }}
            >
              Install hooks
            </button>
            <button
              type="button"
              disabled={busy || !repoId}
              className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              onClick={async () => {
                if (!repoId) return;
                setBusy(true);
                setMessage(null);
                try {
                  await uninstallRepoHooks(repoId);
                  setMessage('Uninstalled repo hooks.');
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(false);
                  refresh();
                }
              }}
            >
              Uninstall hooks
            </button>
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              onClick={async () => {
                setMessage(null);
                await refresh();
              }}
            >
              Refresh
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-tertiary px-3 py-2">
            <div className="text-[11px] text-text-secondary font-semibold">
              Indexed commits: <span className="font-mono">{indexedCommitShas?.length ?? 0}</span>
            </div>
            {repoCounts ? (
              <div className="text-[11px] text-text-tertiary">
                Anchors: attribution {repoCounts.attribution}/{repoCounts.total} · sessions {repoCounts.sessions}/
                {repoCounts.total} · lineage {repoCounts.lineage}/{repoCounts.total} · complete {repoCounts.complete}/
                {repoCounts.total}
              </div>
            ) : (
              <div className="text-[11px] text-text-tertiary">
                Refresh to summarize Story Anchors coverage across indexed commits.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !canRunRepoActions || !repoId || !indexedCommitShas}
                className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                onClick={async () => {
                  if (!repoId || !indexedCommitShas?.length) return;
                  setBusy(true);
                  setMessage(null);
                  try {
                    const rows = await getStoryAnchorStatus(repoId, indexedCommitShas);
                    const total = rows.length;
                    const attribution = rows.filter((r) => r.hasAttributionNote).length;
                    const sessions = rows.filter((r) => r.hasSessionsNote).length;
                    const lineage = rows.filter((r) => r.hasLineageNote).length;
                    const complete = rows.filter(
                      (r) => r.hasAttributionNote && r.hasSessionsNote && r.hasLineageNote
                    ).length;
                    setRepoCounts({ total, attribution, sessions, lineage, complete });
                    setMessage(`Refreshed Story Anchors status for ${total} commits.`);
                  } catch (e) {
                    setRepoCounts(null);
                    setMessage(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                    refresh();
                  }
                }}
              >
                Refresh indexed status
              </button>
              <button
                type="button"
                disabled={busy || !canRunRepoActions || !repoId || !indexedCommitShas}
                className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                onClick={async () => {
                  if (!repoId || !indexedCommitShas?.length) return;
                  setBusy(true);
                  setMessage(null);
                  try {
                    const res = await importSessionLinkNotesBatch(repoId, indexedCommitShas);
                    setMessage(`Imported sessions notes: ${res.imported}/${res.total}.`);
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                    refresh();
                  }
                }}
              >
                Import sessions notes
              </button>
              <button
                type="button"
                disabled={busy || !canRunRepoActions || !repoId || !indexedCommitShas}
                className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                onClick={async () => {
                  if (!repoId || !indexedCommitShas?.length) return;
                  setBusy(true);
                  setMessage(null);
                  setExportProgress({ done: 0, total: indexedCommitShas.length });
                  let ok = 0;
                  let failed = 0;
                  try {
                    for (let i = 0; i < indexedCommitShas.length; i += 1) {
                      const sha = indexedCommitShas[i];
                      try {
                        await exportSessionLinkNote(repoId, sha);
                        ok += 1;
                      } catch {
                        failed += 1;
                      } finally {
                        setExportProgress({ done: i + 1, total: indexedCommitShas.length });
                      }
                    }
                    setMessage(`Exported sessions notes: ok=${ok}, failed=${failed}.`);
                  } finally {
                    setExportProgress(null);
                    setBusy(false);
                    refresh();
                  }
                }}
              >
                Export sessions notes
              </button>
              <button
                type="button"
                disabled={busy || !canRunRepoActions || !repoId || !indexedCommitShas}
                className="inline-flex items-center rounded-md border border-accent-amber-light bg-accent-amber-bg px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light disabled:opacity-50"
                onClick={async () => {
                  if (!repoId || !indexedCommitShas?.length) return;
                  setBusy(true);
                  setMessage(null);
                  try {
                    const res = await migrateAttributionNotesRef(repoId, indexedCommitShas);
                    setMessage(`Migrate attribution ref: ${res.migrated}/${res.total}.`);
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                    refresh();
                  }
                }}
              >
                Migrate attribution ref
              </button>
              <button
                type="button"
                disabled={busy || !canRunRepoActions || !repoId || !indexedCommitShas}
                className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                onClick={async () => {
                  if (!repoId || !indexedCommitShas?.length) return;
                  setBusy(true);
                  setMessage(null);
                  try {
                    const res = await reconcileAfterRewrite(repoId, indexedCommitShas, false);
                    setMessage(
                      `Reconcile (dry-run): recovered attribution=${res.recoveredAttribution}, sessions=${res.recoveredSessions}, wrote=${res.wroteNotes}.`
                    );
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                    refresh();
                  }
                }}
              >
                Reconcile (dry-run)
              </button>
              <button
                type="button"
                disabled={busy || !canRunRepoActions || !repoId || !indexedCommitShas}
                className="inline-flex items-center rounded-md border border-accent-amber-light bg-accent-amber-bg px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light disabled:opacity-50"
                onClick={async () => {
                  if (!repoId || !indexedCommitShas?.length) return;
                  setBusy(true);
                  setMessage(null);
                  try {
                    const res = await reconcileAfterRewrite(repoId, indexedCommitShas, true);
                    setMessage(
                      `Reconcile (write): recovered attribution=${res.recoveredAttribution}, sessions=${res.recoveredSessions}, wrote=${res.wroteNotes}.`
                    );
                  } catch (e) {
                    setMessage(e instanceof Error ? e.message : String(e));
                  } finally {
                    setBusy(false);
                    refresh();
                  }
                }}
              >
                Reconcile (write)
              </button>
            </div>
            {exportProgress ? (
              <div className="text-[11px] text-text-muted">
                Exporting… {exportProgress.done}/{exportProgress.total}
              </div>
            ) : null}
          </div>

          {selectedCommitSha ? (
            <div className="mt-2 flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-tertiary px-3 py-2">
              <div className="text-[11px] text-text-secondary font-semibold">
                Selected commit: <span className="font-mono">{selectedCommitSha.slice(0, 8)}</span>
              </div>
              <div className="text-[11px] text-text-tertiary">
                Notes: attribution {status?.hasAttributionNote ? '✓' : '—'} · sessions{' '}
                {status?.hasSessionsNote ? '✓' : '—'} · lineage {status?.hasLineageNote ? '✓' : '—'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !canRunCommitActions || !repoId || !selectedCommitSha}
                  className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                  onClick={async () => {
                    if (!repoId || !selectedCommitSha) return;
                    setBusy(true);
                    setMessage(null);
                    try {
                      const res = await importSessionLinkNotesBatch(repoId, [selectedCommitSha]);
                      setMessage(`Imported sessions note: ${res.imported}/${res.total}.`);
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                      refresh();
                    }
                  }}
                >
                  Import sessions note
                </button>
                <button
                  type="button"
                  disabled={busy || !canRunCommitActions || !repoId || !selectedCommitSha}
                  className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                  onClick={async () => {
                    if (!repoId || !selectedCommitSha) return;
                    setBusy(true);
                    setMessage(null);
                    try {
                      const res = await exportSessionLinkNote(repoId, selectedCommitSha);
                      setMessage(`Export sessions note: ${res.status}.`);
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                      refresh();
                    }
                  }}
                >
                  Export sessions note
                </button>
                <button
                  type="button"
                  disabled={busy || !canRunCommitActions || !repoId || !selectedCommitSha}
                  className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                  onClick={async () => {
                    if (!repoId || !selectedCommitSha) return;
                    setBusy(true);
                    setMessage(null);
                    try {
                      const res = await reconcileAfterRewrite(repoId, [selectedCommitSha], false);
                      setMessage(
                        `Reconcile: recovered attribution=${res.recoveredAttribution}, sessions=${res.recoveredSessions}.`
                      );
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                      refresh();
                    }
                  }}
                >
                  Reconcile (no write)
                </button>
                <button
                  type="button"
                  disabled={busy || !canRunCommitActions || !repoId || !selectedCommitSha}
                  className="inline-flex items-center rounded-md border border-accent-amber-light bg-accent-amber-bg px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light disabled:opacity-50"
                  onClick={async () => {
                    if (!repoId || !selectedCommitSha) return;
                    setBusy(true);
                    setMessage(null);
                    try {
                      const res = await reconcileAfterRewrite(repoId, [selectedCommitSha], true);
                      setMessage(
                        `Reconcile (write): recovered attribution=${res.recoveredAttribution}, sessions=${res.recoveredSessions}, wrote=${res.wroteNotes}.`
                      );
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                      refresh();
                    }
                  }}
                >
                  Reconcile (write)
                </button>
                <button
                  type="button"
                  disabled={busy || !canRunCommitActions || !repoId || !selectedCommitSha}
                  className="inline-flex items-center rounded-md border border-accent-amber-light bg-accent-amber-bg px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light disabled:opacity-50"
                  onClick={async () => {
                    if (!repoId || !selectedCommitSha) return;
                    setBusy(true);
                    setMessage(null);
                    try {
                      const res = await migrateAttributionNotesRef(repoId, [selectedCommitSha]);
                      setMessage(`Migrate attribution ref: ${res.migrated}/${res.total}.`);
                    } catch (e) {
                      setMessage(e instanceof Error ? e.message : String(e));
                    } finally {
                      setBusy(false);
                      refresh();
                    }
                  }}
                >
                  Migrate attribution ref
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-text-muted">
              Select a commit to manage its session link note + reconcile status.
            </div>
          )}

          {message ? <div className="text-[11px] text-text-muted">{message}</div> : null}
        </>
      )}
    </div>
  );
}
