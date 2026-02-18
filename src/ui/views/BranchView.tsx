import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AttributionPrefs, AttributionPrefsUpdate } from '../../core/attribution-api';
import { FileSelectionProvider, useFileSelection } from '../../core/context/FileSelectionContext';
import { testRuns } from '../../core/demo/nearbyGridDemo';
import { getLatestTestRunForCommit } from '../../core/repo/testRuns';
import type { ActivityEvent } from '../../core/tauri/activity';
import type { DiscoveredSources, IngestConfig, OtlpKeyStatus } from '../../core/tauri/ingestConfig';
import { composeBranchNarrative } from '../../core/narrative/composeBranchNarrative';
import { trackNarrativeEvent } from '../../core/telemetry/narrativeTelemetry';
import type {
  BranchViewModel,
  DashboardFilter,
  FileChange,
  NarrativeDetailLevel,
  NarrativeEvidenceLink,
  TestRun,
  TraceRange,
} from '../../core/types';
import type { IngestIssue, IngestStatus } from '../../hooks/useAutoIngest';
import { useFirefly } from '../../hooks/useFirefly';
import { useTestImport } from '../../hooks/useTestImport';
import { BranchNarrativePanel } from '../components/BranchNarrativePanel';
import { BranchHeader } from '../components/BranchHeader';
import { Breadcrumb } from '../components/Breadcrumb';
import { CaptureActivityStrip } from '../components/CaptureActivityStrip';
import { FilesChanged } from '../components/FilesChanged';
import { ImportErrorBanner } from '../components/ImportErrorBanner';
import { IngestToast } from '../components/IngestToast';
import { IntentList } from '../components/IntentList';
import { NeedsAttentionList } from '../components/NeedsAttentionList';
import { RightPanelTabs } from '../components/RightPanelTabs';
import { SkeletonFiles } from '../components/Skeleton';
import { Timeline, type FireflyTrackingSettlePayload } from '../components/Timeline';

function BranchViewInner(props: {
  model: BranchViewModel;
  dashboardFilter?: DashboardFilter | null;
  onClearFilter?: () => void;
  isExitingFilteredView?: boolean;
  updateModel: (updater: (prev: BranchViewModel) => BranchViewModel) => void;
  loadFilesForNode: (nodeId: string) => Promise<FileChange[]>;
  loadDiffForFile: (nodeId: string, filePath: string) => Promise<string>;
  loadTraceRangesForFile: (nodeId: string, filePath: string) => Promise<TraceRange[]>;
  onExportAgentTrace: (nodeId: string, files: FileChange[]) => void;
  onRunOtlpSmokeTest: (nodeId: string, files: FileChange[]) => void;
  onUpdateCodexOtelPath?: (path: string) => void;
  onToggleCodexOtelReceiver?: (enabled: boolean) => void;
  onOpenCodexOtelDocs?: () => void;
  codexPromptExport?: { enabled: boolean | null; configPath: string | null };
  attributionPrefs?: AttributionPrefs | null;
  onUpdateAttributionPrefs?: (update: AttributionPrefsUpdate) => void;
  onPurgeAttributionMetadata?: () => void;
  onUnlinkSession?: (sessionId: string) => void;
  actionError?: string | null;
  setActionError: (error: string | null) => void;
  onDismissActionError?: () => void;
  ingestStatus?: IngestStatus;
  ingestActivityRecent?: ActivityEvent[];
  onRequestIngestActivityAll?: () => Promise<ActivityEvent[]>;
  ingestIssues?: IngestIssue[];
  onDismissIngestIssue?: (id: string) => void;
  onToggleAutoIngest?: (enabled: boolean) => void;
  ingestToast?: { id: string; message: string } | null;
  ingestConfig?: IngestConfig | null;
  otlpKeyStatus?: OtlpKeyStatus | null;
  discoveredSources?: DiscoveredSources | null;
  onUpdateWatchPaths?: (paths: { claude: string[]; cursor: string[]; codexLogs: string[] }) => void;
  onConfigureCodex?: () => void;
  onRotateOtlpKey?: () => void;
  onGrantCodexConsent?: () => void;
}) {
  const {
    model,
    dashboardFilter,
    onClearFilter,
    isExitingFilteredView,
    updateModel,
    loadFilesForNode,
    loadDiffForFile,
    loadTraceRangesForFile,
    onExportAgentTrace,
    onRunOtlpSmokeTest,
    onUpdateCodexOtelPath,
    onToggleCodexOtelReceiver,
    onOpenCodexOtelDocs,
    codexPromptExport,
    attributionPrefs,
    onUpdateAttributionPrefs,
    onPurgeAttributionMetadata,
    onUnlinkSession,
    actionError,
    setActionError,
    onDismissActionError,
    ingestStatus,
    ingestActivityRecent,
    onRequestIngestActivityAll,
    ingestIssues,
    onDismissIngestIssue,
    onToggleAutoIngest,
    ingestToast,
    ingestConfig,
    otlpKeyStatus,
    discoveredSources,
    onUpdateWatchPaths,
    onConfigureCodex,
    onRotateOtlpKey,
    onGrantCodexConsent,
  } = props;
  const { selectedFile, selectFile } = useFileSelection();

  const defaultSelectedId = useMemo(() => {
    const head = model.meta?.headSha;
    if (head && model.timeline.some((n) => n.id === head)) return head;
    return model.timeline[model.timeline.length - 1]?.id ?? null;
  }, [model]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(defaultSelectedId);
  // Track which commits have already pulsed (once per app session)
  const pulsedCommits = useRef<Set<string>>(new Set());
  const [pulseCommitId, setPulseCommitId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileChange[]>([]);
  const [diffText, setDiffText] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [traceRanges, setTraceRanges] = useState<TraceRange[]>([]);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [traceRequestedForSelection, setTraceRequestedForSelection] = useState(false);
  const [trackingSettledNodeId, setTrackingSettledNodeId] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<NarrativeDetailLevel>('summary');

  const narrative = useMemo(() => model.narrative ?? composeBranchNarrative(model), [model]);

  const selectedNode = useMemo(
    () => model.timeline.find((node) => node.id === selectedNodeId) ?? null,
    [model.timeline, selectedNodeId]
  );

  const selectedCommitSha = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'commit') return null;
    return selectedNode.id;
  }, [selectedNode]);

  const reportFireflyError = useCallback((message: string) => {
    setActionError(message);
  }, [setActionError]);

  const firefly = useFirefly({
    selectedNodeId,
    selectedCommitSha,
    hasSelectedFile: Boolean(selectedFile),
    trackingSettled: selectedNodeId !== null && trackingSettledNodeId === selectedNodeId,
    loadingFiles,
    loadingDiff,
    loadingTrace,
    traceRequestedForSelection,
    traceSummary: selectedCommitSha ? model.traceSummaries?.byCommit[selectedCommitSha] : undefined,
    onPersistenceError: reportFireflyError,
  });

  // Demo: test run lookup is driven by node.testRunId.
  const demoTestRun = useMemo((): TestRun | undefined => {
    if (model.source !== 'demo') return undefined;
    const node = model.timeline.find((n) => n.id === selectedNodeId);
    const id = node?.testRunId;
    if (!id) return undefined;
    return testRuns[id];
  }, [model, selectedNodeId]);

  // Repo: load latest test run from DB for the selected commit.
  const [repoTestRun, setRepoTestRun] = useState<TestRun | null>(null);
  const [loadingTests, setLoadingTests] = useState(false);

  const repoRoot = model.meta?.repoPath ?? '';
  const repoId = model.meta?.repoId ?? null;

  const refreshRepoTestRun = useCallback(async () => {
    if (model.source !== 'git') return;
    if (!repoId || !selectedCommitSha) {
      setRepoTestRun(null);
      return;
    }
    setLoadingTests(true);
    try {
      const run = await getLatestTestRunForCommit(repoId, selectedCommitSha);
      setRepoTestRun(run);
    } catch {
      setRepoTestRun(null);
    } finally {
      setLoadingTests(false);
    }
  }, [model.source, repoId, selectedCommitSha]);

  useEffect(() => {
    refreshRepoTestRun();
  }, [refreshRepoTestRun]);

  const testRun = model.source === 'demo' ? demoTestRun : repoTestRun ?? undefined;

  // Preserve selection across model updates when possible.
  useEffect(() => {
    setSelectedNodeId((prev) => {
      if (prev && model.timeline.some((node) => node.id === prev)) return prev;
      return defaultSelectedId;
    });
  }, [defaultSelectedId, model.timeline]);

  useEffect(() => {
    if (!selectedNodeId) return;
    let cancelled = false;

    setLoadingFiles(true);
    setError(null);

    loadFilesForNode(selectedNodeId)
      .then((f) => {
        if (cancelled) return;
        setFiles(f);
        if (!selectedFile && f[0]?.path) {
          selectFile(f[0].path);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        setActionError(`Unable to load files for selected node: ${message}`);
        setFiles([]);
        selectFile(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingFiles(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNodeId, loadFilesForNode, selectFile, selectedFile, setActionError]);

  useEffect(() => {
    if (!selectedNodeId || !selectedFile) return;
    let cancelled = false;

    setLoadingDiff(true);
    setError(null);

    loadDiffForFile(selectedNodeId, selectedFile)
      .then((d) => {
        if (cancelled) return;
        setDiffText(d || '(no diff)');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        setActionError(`Unable to load diff for selected file: ${message}`);
        setDiffText(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingDiff(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedNodeId, selectedFile, loadDiffForFile, setActionError]);

  useEffect(() => {
    if (!selectedNodeId || !selectedFile || !selectedCommitSha) {
      setTraceRequestedForSelection(false);
      setTraceRanges([]);
      setLoadingTrace(false);
      return;
    }
    let cancelled = false;

    setTraceRequestedForSelection(true);
    setLoadingTrace(true);
    loadTraceRangesForFile(selectedNodeId, selectedFile)
      .then((ranges) => {
        if (cancelled) return;
        setTraceRanges(ranges);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setActionError(`Unable to load trace ranges for selected file: ${message}`);
        setTraceRanges([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingTrace(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCommitSha, selectedNodeId, selectedFile, loadTraceRangesForFile, setActionError]);

  // Pulse commit badge once on first successful import
  useEffect(() => {
    // Find commits with session badges (linked sessions)
    const linkedCommits = model.timeline.filter(node =>
      node.badges?.some(b => b.type === 'session')
    );

    for (const commit of linkedCommits) {
      if (!pulsedCommits.current.has(commit.id)) {
        // First time seeing this linked commit - trigger pulse once
        pulsedCommits.current.add(commit.id);
        setPulseCommitId(commit.id);

        // Clear pulse state after animation completes (1.5s animation + buffer)
        const timer = setTimeout(() => {
          setPulseCommitId(null);
        }, 1600);
        return () => clearTimeout(timer);
      }
    }
  }, [model.timeline]);

  const handleFileClickFromSession = (path: string) => {
    const fileExists = files.some((f) => f.path === path);
    if (fileExists) {
      selectFile(path);
    }
  };

  const handleFileClickFromTest = (path: string) => {
    handleFileClickFromSession(path);
  };

  const handleCommitClickFromSession = (commitSha: string) => {
    setTrackingSettledNodeId(null);
    setSelectedNodeId(commitSha);
  };

  const handleSelectNode = useCallback((nodeId: string) => {
    setTrackingSettledNodeId(null);
    setSelectedNodeId(nodeId);
  }, []);

  const handleDetailLevelChange = useCallback((level: NarrativeDetailLevel) => {
    setDetailLevel(level);
    trackNarrativeEvent('layer_switched', {
      branch: model.meta?.branchName,
      detailLevel: level,
      confidence: narrative.confidence,
    });
  }, [model.meta?.branchName, narrative.confidence]);

  const handleOpenEvidence = useCallback((link: NarrativeEvidenceLink) => {
    if (link.commitSha) {
      setTrackingSettledNodeId(null);
      setSelectedNodeId(link.commitSha);
    }
    if (link.filePath) {
      selectFile(link.filePath);
    }
    trackNarrativeEvent('evidence_opened', {
      branch: model.meta?.branchName,
      detailLevel,
      evidenceKind: link.kind,
      confidence: narrative.confidence,
    });
  }, [detailLevel, model.meta?.branchName, narrative.confidence, selectFile]);

  const handleOpenRawDiff = useCallback(() => {
    setDetailLevel('diff');
    if (!selectedFile && files[0]?.path) {
      selectFile(files[0].path);
    }
    trackNarrativeEvent('fallback_used', {
      branch: model.meta?.branchName,
      detailLevel: 'diff',
      confidence: narrative.confidence,
    });
  }, [files, model.meta?.branchName, narrative.confidence, selectFile, selectedFile]);

  const handleExportAgentTrace = () => {
    if (!selectedNodeId) return;
    onExportAgentTrace(selectedNodeId, files);
  };

  const handleRunOtlpSmokeTest = () => {
    if (!selectedNodeId) return;
    onRunOtlpSmokeTest(selectedNodeId, files);
  };

  const handleFireflyTrackingSettled = useCallback((payload: FireflyTrackingSettlePayload) => {
    if (!selectedNodeId) return;
    if (payload.selectedNodeId !== selectedNodeId) return;
    setTrackingSettledNodeId(payload.selectedNodeId);
  }, [selectedNodeId]);

  const { importJUnitForCommit } = useTestImport({
    repoRoot,
    repoId: repoId ?? 0,
    setRepoState: updateModel,
    setActionError,
  });

  const handleImportJUnit = async () => {
    if (model.source !== 'git') return;
    if (!repoId) return;
    if (!selectedCommitSha) return;
    await importJUnitForCommit(selectedCommitSha);
    await refreshRepoTestRun();
  };

  return (
    <div className={`flex h-full flex-col animate-in fade-in slide-in-from-bottom-1 motion-page-enter ${isExitingFilteredView ? 'animate-out fade-out slide-out-to-top-2 motion-page-exit fill-mode-forwards' : ''}`}>
      <IngestToast toast={ingestToast ?? null} />
      <div className="flex-1 overflow-hidden bg-bg-secondary">
        <div className="flex flex-col gap-5 p-6 lg:p-8 h-full overflow-y-auto bg-bg-tertiary lg:grid lg:grid-cols-12 lg:overflow-hidden">
          {/* Left column */}
          <div className="flex flex-col gap-5 lg:col-span-7 lg:overflow-y-auto lg:pr-1">
            <BranchHeader model={model} dashboardFilter={dashboardFilter} onClearFilter={onClearFilter} />
            <BranchNarrativePanel
              narrative={narrative}
              detailLevel={detailLevel}
              onDetailLevelChange={handleDetailLevelChange}
              onOpenEvidence={handleOpenEvidence}
              onOpenRawDiff={handleOpenRawDiff}
            />
            {ingestStatus ? (
              <CaptureActivityStrip
                enabled={ingestStatus.enabled}
                sourcesLabel={(() => {
                  const out: string[] = [];
                  if (discoveredSources?.claude?.length) out.push('Claude');
                  if (discoveredSources?.cursor?.length) out.push('Cursor');
                  if (discoveredSources?.codexLogs?.length) out.push('Codex');
                  return out.join(', ');
                })()}
                issueCount={ingestStatus.errorCount}
                lastSeenISO={ingestStatus.lastImportAt}
                recent={ingestActivityRecent ?? []}
                onToggle={onToggleAutoIngest}
                onRequestAll={onRequestIngestActivityAll}
              />
            ) : null}
            {ingestIssues && onDismissIngestIssue ? (
              <NeedsAttentionList issues={ingestIssues} onDismiss={onDismissIngestIssue} />
            ) : null}
            <IntentList items={model.intent} />
            {/* Breadcrumb navigation */}
            {selectedNode && (
              <div className="flex items-center gap-2 px-1">
                <Breadcrumb
                  segments={[
                    { label: model.meta?.branchName || 'main', icon: 'branch' },
                    { label: selectedNode.label || selectedNode.id.slice(0, 8), icon: 'commit' },
                  ]}
                />
              </div>
            )}

            <div>
              {loadingFiles ? (
                <div className="card p-5">
                  <div className="section-header">FILES CHANGED</div>
                  <div className="section-subheader mt-0.5">loading…</div>
                  <div className="mt-4">
                    <SkeletonFiles count={5} />
                  </div>
                </div>
              ) : (
                <FilesChanged
                  files={files}
                  title="FILES CHANGED"
                  traceByFile={selectedNodeId ? model.traceSummaries?.byFileByCommit[selectedNodeId] : undefined}
                />
              )}
            </div>

            {actionError && (
              <ImportErrorBanner
                error={actionError}
                onDismiss={onDismissActionError}
              />
            )}
          </div>

          {/* Right column - Tabbed interface */}
          <div className="flex flex-col min-w-0 lg:col-span-5 lg:overflow-hidden">
            <RightPanelTabs
              // Session
              sessionExcerpts={model.sessionExcerpts}
              selectedFile={selectedFile}
              onFileClick={handleFileClickFromSession}
              onUnlinkSession={onUnlinkSession}
              onCommitClick={handleCommitClickFromSession}
              selectedCommitId={selectedNodeId}
              // Attribution
              traceSummary={selectedNodeId ? model.traceSummaries?.byCommit[selectedNodeId] : undefined}
              traceStatus={model.traceStatus}
              hasFiles={files.length > 0}
              onExportAgentTrace={handleExportAgentTrace}
              onRunOtlpSmokeTest={handleRunOtlpSmokeTest}
              // Settings
              traceConfig={model.traceConfig}
              onUpdateCodexOtelPath={onUpdateCodexOtelPath}
              onToggleCodexOtelReceiver={onToggleCodexOtelReceiver}
              onOpenCodexOtelDocs={onOpenCodexOtelDocs}
              codexPromptExport={codexPromptExport}
              attributionPrefs={attributionPrefs}
              onUpdateAttributionPrefs={onUpdateAttributionPrefs}
              onPurgeAttributionMetadata={onPurgeAttributionMetadata}
              ingestConfig={ingestConfig}
              otlpKeyStatus={otlpKeyStatus}
              discoveredSources={discoveredSources}
              onToggleAutoIngest={onToggleAutoIngest}
              onUpdateWatchPaths={onUpdateWatchPaths}
              onConfigureCodex={onConfigureCodex}
              onRotateOtlpKey={onRotateOtlpKey}
              onGrantCodexConsent={onGrantCodexConsent}
              // Tests
              testRun={testRun}
              onTestFileClick={handleFileClickFromTest}
              loadingTests={loadingTests}
              onImportJUnit={handleImportJUnit}
              repoRoot={repoRoot}
              changedFiles={files.map((f) => f.path)}
              // Diff
              selectedCommitSha={selectedCommitSha}
              repoId={model.meta?.repoId}
              indexedCommitShas={model.timeline.filter((n) => n.type === 'commit').map((n) => n.id)}
              diffText={diffText}
              loadingDiff={loadingDiff || loadingTrace}
              traceRanges={traceRanges}
              // Firefly
              fireflyEnabled={firefly.enabled}
              onToggleFirefly={firefly.toggle}
            />
          </div>
        </div>
      </div>

      <Timeline
        nodes={model.timeline}
        selectedId={selectedNodeId}
        onSelect={handleSelectNode}
        pulseCommitId={pulseCommitId}
        fireflyEvent={firefly.event}
        fireflyDisabled={!firefly.enabled}
        onFireflyTrackingSettled={handleFireflyTrackingSettled}
      />
    </div>
  );
}

export function BranchView(props: {
  model: BranchViewModel;
  dashboardFilter?: DashboardFilter | null;
  onClearFilter?: () => void;
  isExitingFilteredView?: boolean;
  updateModel: (updater: (prev: BranchViewModel) => BranchViewModel) => void;
  loadFilesForNode: (nodeId: string) => Promise<FileChange[]>;
  loadDiffForFile: (nodeId: string, filePath: string) => Promise<string>;
  loadTraceRangesForFile: (nodeId: string, filePath: string) => Promise<TraceRange[]>;
  onExportAgentTrace: (nodeId: string, files: FileChange[]) => void;
  onRunOtlpSmokeTest: (nodeId: string, files: FileChange[]) => void;
  onUpdateCodexOtelPath?: (path: string) => void;
  onToggleCodexOtelReceiver?: (enabled: boolean) => void;
  onOpenCodexOtelDocs?: () => void;
  codexPromptExport?: { enabled: boolean | null; configPath: string | null };
  attributionPrefs?: AttributionPrefs | null;
  onUpdateAttributionPrefs?: (update: AttributionPrefsUpdate) => void;
  onPurgeAttributionMetadata?: () => void;
  onUnlinkSession?: (sessionId: string) => void;
  actionError?: string | null;
  setActionError: (error: string | null) => void;
  onDismissActionError?: () => void;
  ingestStatus?: IngestStatus;
  ingestActivityRecent?: ActivityEvent[];
  onRequestIngestActivityAll?: () => Promise<ActivityEvent[]>;
  ingestIssues?: IngestIssue[];
  onDismissIngestIssue?: (id: string) => void;
  onToggleAutoIngest?: (enabled: boolean) => void;
  ingestToast?: { id: string; message: string } | null;
  ingestConfig?: IngestConfig | null;
  otlpKeyStatus?: OtlpKeyStatus | null;
  discoveredSources?: DiscoveredSources | null;
  onUpdateWatchPaths?: (paths: { claude: string[]; cursor: string[]; codexLogs: string[] }) => void;
  onConfigureCodex?: () => void;
  onRotateOtlpKey?: () => void;
  onGrantCodexConsent?: () => void;
}) {
  return (
    <FileSelectionProvider>
      <BranchViewInner {...props} />
    </FileSelectionProvider>
  );
}
