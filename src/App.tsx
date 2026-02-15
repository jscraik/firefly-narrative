import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, FolderOpen, Loader2 } from 'lucide-react';
import { setOtelReceiverEnabled } from './core/tauri/otelReceiver';
import type {
  BranchViewModel,
  TraceCollectorConfig
} from './core/types';
import type { DashboardFilter } from './core/types';
import { RepoEmptyState } from './ui/components/RepoEmptyState';
import { TopNav, type Mode } from './ui/components/TopNav';
import { BranchView } from './ui/views/BranchView';
import { DashboardView } from './ui/views/DashboardView';
import { DocsOverviewPanel } from './ui/components/DocsOverviewPanel';
import { useRepoLoader, type RepoState } from './hooks/useRepoLoader';
import { useUpdater } from './hooks/useUpdater';
import { useTraceCollector } from './hooks/useTraceCollector';
import { useSessionImport } from './hooks/useSessionImport';
import { useAutoIngest } from './hooks/useAutoIngest';
import { useCommitData } from './hooks/useCommitData';
import { UpdatePrompt, UpdateIndicator } from './ui/components/UpdatePrompt';
import { indexRepo } from './core/repo/indexer';

type AgentationComponentType = (typeof import('agentation'))['Agentation'];

const EMPTY_MODEL: BranchViewModel = {
  source: 'git',
  title: '',
  status: 'open',
  description: '',
  stats: {
    added: 0,
    removed: 0,
    files: 0,
    commits: 0,
    prompts: 0,
    responses: 0
  },
  intent: [],
  timeline: []
};

/**
 * Docs view wrapper that auto-loads the current directory as repo if needed.
 * This ensures Docs mode works even when switching from Demo mode.
 */
function DocsView(props: {
  repoState: RepoState;
  setRepoState: React.Dispatch<React.SetStateAction<RepoState>>;
  onClose: () => void;
  onOpenRepo: () => void;
}) {
  const { repoState, setRepoState, onClose, onOpenRepo } = props;
  const [isLoading, setIsLoading] = useState(false);

  // Auto-load current directory as repo when Docs is opened without a loaded repo
  useEffect(() => {
    if (repoState.status !== 'idle' && repoState.status !== 'error') {
      return; // Already loaded or loading
    }

    const loadCurrentDir = async () => {
      if (!import.meta.env.DEV) {
        return;
      }

      setIsLoading(true);
      try {
        // Dev-only fallback to a local repo path
        const defaultPath = '/Users/jamiecraik/dev/narrative';

        setRepoState({ status: 'loading', path: defaultPath });

        const { model, repo } = await indexRepo(defaultPath, 60);
        setRepoState({ status: 'ready', path: defaultPath, model, repo });
      } catch (e) {
        console.error('[DocsView] Failed to auto-load repo:', e);
        // Don't change state on error - let the UI show "No Repository Open"
        setRepoState({ status: 'idle' });
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentDir();
  }, [repoState.status, setRepoState]);

  if (repoState.status === 'loading' || isLoading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center">
          {/* Animated spinner with clearer visual hierarchy */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-card border border-border-light shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
          </div>
          
          <h3 className="text-base font-semibold text-text-primary">
            Loading documentation…
          </h3>
          <p className="mt-2 text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
            Indexing repository files and building navigation.
          </p>
          <p className="mt-4 text-xs text-text-tertiary">
            This may take a moment for larger repositories.
          </p>
        </div>
      </div>
    );
  }

  if (repoState.status !== 'ready') {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-border-light bg-bg-card shadow-sm">
            <BookOpen className="h-10 w-10 text-text-secondary" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">No repository open</h2>
          <p className="mt-2 text-base text-text-secondary max-w-sm mx-auto leading-relaxed">
            Open a repository using the button in the top navigation to browse documentation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4 overflow-hidden">
      <DocsOverviewPanel 
        repoRoot={repoState.repo.root}
        onClose={onClose}
      />
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>('demo');
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter | null>(null);
  const [isExitingFilteredView, setIsExitingFilteredView] = useState(false);
  const [AgentationComponent, setAgentationComponent] = useState<AgentationComponentType | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let cancelled = false;
    import('agentation')
      .then((mod) => {
        if (!cancelled) {
          setAgentationComponent(() => mod.Agentation);
        }
      })
      .catch((error) => {
        console.warn('[Agentation] Failed to load dev panel:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Clear dashboard filter when switching away from repo mode (optional UX enhancement)
  useEffect(() => {
    if (mode !== 'repo' && dashboardFilter) {
      setDashboardFilter(null);
    }
  }, [mode, dashboardFilter]);

  // Repo loading and indexing
  const {
    repoState,
    setRepoState,
    indexingProgress,
    codexPromptExport,
    attributionPrefs,
    actionError,
    setActionError,
    openRepo,
    updateAttributionPrefs,
    purgeAttributionMetadata,
    diffCache
  } = useRepoLoader();

  const modelForHooks = repoState.status === 'ready' ? repoState.model : EMPTY_MODEL;

  // OTLP trace collection events and handlers
  const traceCollectorHandlers = useTraceCollector({
    repoRoot: repoState.status === 'ready' ? repoState.repo.root : '',
    repoId: repoState.status === 'ready' ? repoState.repo.repoId : 0,
    timeline: repoState.status === 'ready' ? repoState.model.timeline : [],
    setRepoState: (updater) => {
      setRepoState((prev) => {
        if (prev.status !== 'ready') return prev;
        return { ...prev, model: updater(prev.model) };
      });
    },
    setActionError
  });

  // Session import handlers
  const sessionImportHandlers = useSessionImport({
    repoRoot: repoState.status === 'ready' ? repoState.repo.root : '',
    repoId: repoState.status === 'ready' ? repoState.repo.repoId : 0,
    model: modelForHooks,
    setRepoState: (updater) => {
      setRepoState((prev) => {
        if (prev.status !== 'ready') return prev;
        return { ...prev, model: updater(prev.model) };
      });
    },
    setActionError
  });

  const autoIngest = useAutoIngest({
    repoRoot: repoState.status === 'ready' ? repoState.repo.root : '',
    repoId: repoState.status === 'ready' ? repoState.repo.repoId : 0,
    model: modelForHooks,
    setRepoState: (updater) => {
      setRepoState((prev) => {
        if (prev.status !== 'ready') return prev;
        return { ...prev, model: updater(prev.model) };
      });
    }
  });

  // Commit data loading (model, path, files, diffs, traces)
  const commitData = useCommitData({
    mode,
    repoState,
    diffCache: diffCache as unknown as React.MutableRefObject<{ get(key: string): string | undefined; set(key: string, value: string): void }>,
    model: null // Will be computed inside the hook
  });

  // Auto-updater integration
  const { status: updateStatus, checkForUpdates, downloadAndInstall, dismiss } = useUpdater({
    checkOnMount: true, // Check for updates on app launch
    pollIntervalMinutes: 60 * 24 // Check once per day
  });

  const updateCodexOtelReceiverEnabled = useCallback(
    async (enabled: boolean) => {
      try {
        await setOtelReceiverEnabled(enabled);
        setRepoState((prev) => {
          if (prev.status !== 'ready') return prev;
          return {
            ...prev,
            model: {
              ...prev.model,
              traceConfig: {
                ...(prev.model.traceConfig ?? {} as TraceCollectorConfig),
                codexOtelReceiverEnabled: enabled
              } as TraceCollectorConfig
            }
          };
        });
      } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : String(e));
      }
    },
    [setRepoState, setActionError]
  );

  const importEnabled = mode === 'repo' && repoState.status === 'ready';

  // Focus management: save active element before drill-down, restore on back
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Handle drill-down navigation from dashboard
  const handleDrillDown = useCallback((filter: DashboardFilter) => {
    // Save current focused element for restoration later
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
    setDashboardFilter(filter);
    setMode('repo');
  }, []);

  // Handle clear filter (back to dashboard) with exit animation
  const handleClearFilter = useCallback(() => {
    // Trigger exit animation
    setIsExitingFilteredView(true);

    // After animation completes, clear filter and restore focus
    setTimeout(() => {
      setDashboardFilter(null);
      setIsExitingFilteredView(false);
      // Restore focus to the element that was focused before drill-down
      if (lastFocusedElementRef.current) {
        lastFocusedElementRef.current.focus();
        lastFocusedElementRef.current = null;
      }
    }, 150); // Match transition duration
  }, []);

  return (
    <div className="flex h-full flex-col bg-bg-page text-text-primary">
      {/* Update Notification */}
      {updateStatus && (
        <UpdatePrompt
          status={updateStatus}
          onUpdate={downloadAndInstall}
          onClose={dismiss}
          onCheckAgain={checkForUpdates}
        />
      )}

      <TopNav
        mode={mode}
        onModeChange={setMode}
        repoPath={commitData.repoPath}
        onOpenRepo={openRepo}
        onImportSession={sessionImportHandlers.importSession}
        onImportKimiSession={sessionImportHandlers.importKimiSession}
        onImportAgentTrace={sessionImportHandlers.importAgentTrace}
        importEnabled={importEnabled}
      >
        {/* Update indicator in nav */}
        <UpdateIndicator status={updateStatus} onClick={checkForUpdates} />
      </TopNav>

      <div className="flex-1 overflow-hidden">
        {mode === 'dashboard' ? (
          <DashboardView
            repoState={repoState}
            setRepoState={setRepoState}
            setActionError={setActionError}
            onDrillDown={handleDrillDown}
            onModeChange={setMode}
            onOpenRepo={openRepo}
          />
        ) : mode === 'docs' ? (
          <DocsView 
            repoState={repoState}
            setRepoState={setRepoState}
            onClose={() => setMode('repo')}
            onOpenRepo={openRepo}
          />
        ) : mode === 'repo' && repoState.status === 'loading' ? (
          <div className="p-8 text-sm text-text-tertiary">
            <div className="text-sm font-medium text-text-secondary">Indexing repo…</div>
            <div className="mt-2 text-xs text-text-tertiary">
              {indexingProgress?.message ?? 'Preparing index…'}
            </div>
            <div className="mt-3 h-2 w-64 max-w-full rounded-full bg-border-light overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-[width] duration-300"
                style={{ width: `${indexingProgress?.percent ?? 0}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-text-muted">
              {indexingProgress?.total
                ? `${indexingProgress.current ?? 0}/${indexingProgress.total} · ${indexingProgress.phase}`
                : indexingProgress?.phase ?? 'loading'}
            </div>
          </div>
        ) : mode === 'repo' && repoState.status === 'error' ? (
          <div className="p-8">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {repoState.message}
            </div>
            <div className="mt-4 text-sm text-text-tertiary">
              Ensure the selected folder is a git repository and that <span className="font-mono">git</span> is
              available on your PATH.
            </div>
          </div>
        ) : commitData.model ? (
          <BranchView
            model={commitData.model}
            updateModel={(updater) => {
              setRepoState((prev) => {
                if (prev.status !== 'ready') return prev;
                return { ...prev, model: updater(prev.model) };
              });
            }}
            dashboardFilter={dashboardFilter}
            onClearFilter={handleClearFilter}
            isExitingFilteredView={isExitingFilteredView}
            loadFilesForNode={commitData.loadFilesForNode}
            loadDiffForFile={commitData.loadDiffForFile}
            loadTraceRangesForFile={commitData.loadTraceRangesForFile}
            onExportAgentTrace={traceCollectorHandlers.exportAgentTrace}
            onRunOtlpSmokeTest={traceCollectorHandlers.runOtlpSmokeTestHandler}
            onUpdateCodexOtelPath={traceCollectorHandlers.updateCodexOtelPath}
            onToggleCodexOtelReceiver={updateCodexOtelReceiverEnabled}
            onOpenCodexOtelDocs={traceCollectorHandlers.openCodexOtelDocs}
            codexPromptExport={codexPromptExport}
            attributionPrefs={attributionPrefs}
            onUpdateAttributionPrefs={updateAttributionPrefs}
            onPurgeAttributionMetadata={purgeAttributionMetadata}
            onUnlinkSession={sessionImportHandlers.unlinkSession}
            actionError={actionError}
            setActionError={setActionError}
            onDismissActionError={() => setActionError(null)}
            ingestStatus={autoIngest.ingestStatus}
            ingestActivityRecent={autoIngest.activityRecent}
            onRequestIngestActivityAll={autoIngest.getActivityAll}
            ingestIssues={autoIngest.issues}
            onDismissIngestIssue={autoIngest.dismissIssue}
            onToggleAutoIngest={autoIngest.toggleAutoIngest}
            ingestToast={autoIngest.toast}
            ingestConfig={autoIngest.ingestConfig}
            otlpKeyStatus={autoIngest.otlpKeyStatus}
            discoveredSources={autoIngest.discoveredSources}
            onUpdateWatchPaths={autoIngest.updateWatchPaths}
            onConfigureCodex={autoIngest.configureCodexTelemetry}
            onRotateOtlpKey={autoIngest.rotateOtlpKey}
            onGrantCodexConsent={autoIngest.grantCodexConsent}
          />
        ) : (
          <RepoEmptyState onOpenRepo={openRepo} />
        )}
      </div>
      {import.meta.env.DEV && AgentationComponent && (
        <AgentationComponent
          endpoint="http://localhost:4747"
          webhookUrl={import.meta.env.VITE_AGENTATION_WEBHOOK_URL}
          onSessionCreated={(sessionId) => {
            console.log('Session started:', sessionId);
          }}
        />
      )}
    </div>
  );
}
