import type { AttributionPrefs } from '../../core/attribution-api';
import { SourceLensEmptyStates } from './SourceLensEmptyStates';
import { SourceLensLineTable } from './SourceLensLineTable';
import { SourceLensStats } from './SourceLensStats';
import { useSourceLensData } from '../../hooks/useSourceLensData';
import type { SourceLine } from './AuthorBadge';

export interface SourceLensViewProps {
  repoId: number;
  commitSha: string;
  filePath: string;
  prefsOverride?: AttributionPrefs | null;
  showHeader?: boolean;
}

export function SourceLensView({
  repoId,
  commitSha,
  filePath,
  prefsOverride,
  showHeader = true
}: SourceLensViewProps) {
  const {
    lines,
    stats,
    noteSummary,
    prefs,
    cliStatus,
    loading,
    syncing,
    hasMore,
    error,
    statsError,
    noteSummaryError,
    syncStatus,
    loadMore,
    handleImportNote,
    handleExportNote,
    handleEnableMetadata,
  } = useSourceLensData({ repoId, commitSha, filePath });

  if ((loading && lines.length === 0) || error || lines.length === 0) {
    return (
      <SourceLensEmptyStates
        loading={loading}
        error={error}
        lineCount={lines.length}
        showHeader={showHeader}
      />
    );
  }

  const hasNote = noteSummary?.hasNote ?? false;
  const hasAiSignals = lines.some((line) => line.authorType !== 'human' && line.authorType !== 'unknown');
  const showSetup = !hasNote && !hasAiSignals;

  if (showSetup) {
    return (
      <div className="card p-5">
        {showHeader ? (
          <>
            <div className="section-header">SOURCE LENS</div>
            <div className="section-subheader mt-0.5">Line-by-line attribution</div>
          </>
        ) : null}
        <div className="mt-3 text-sm text-text-secondary">
          Source Lens only works when your tools write attribution notes. It does not guess.
        </div>
        <ol className="mt-3 list-decimal pl-5 text-xs text-text-tertiary space-y-1">
          <li>Enable Codex telemetry in Settings (or import notes from your tool).</li>
          <li>Click “Import note” to pull attribution data.</li>
          <li>Re-open this file to see AI vs human lines.</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleImportNote}
            disabled={syncing}
            className="inline-flex items-center gap-1 rounded-md border border-border-light bg-white px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-bg-subtle disabled:opacity-50"
          >
            Import note
          </button>
        </div>
        {syncStatus ? (
          <div className="mt-2 text-[11px] text-text-muted">{syncStatus}</div>
        ) : null}
      </div>
    );
  }

  const effectivePrefs = prefsOverride ?? prefs;
  const showLineOverlays = effectivePrefs?.showLineOverlays ?? true;

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-border-subtle">
        <SourceLensStats
          lines={lines}
          stats={stats}
          noteSummary={noteSummary}
          prefs={effectivePrefs}
          cliStatus={cliStatus}
          statsError={statsError}
          noteSummaryError={noteSummaryError}
          syncStatus={syncStatus}
          syncing={syncing}
          onImportNote={handleImportNote}
          onExportNote={handleExportNote}
          onEnableMetadata={handleEnableMetadata}
          showHeader={showHeader}
        />
      </div>

      {!showLineOverlays ? (
        <div className="px-5 py-3 text-xs text-text-muted border-b border-border-subtle">
          Line overlays are hidden by preference.
        </div>
      ) : null}

      <SourceLensLineTable lines={lines} showLineOverlays={showLineOverlays} />

      {hasMore && (
        <div className="p-3 border-t border-border-subtle text-center">
          <button
            type="button"
            onClick={loadMore}
            className="text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            Load more...
          </button>
        </div>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { SourceLine };
