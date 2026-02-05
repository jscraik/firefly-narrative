import { type KeyboardEvent, useEffect, useState } from 'react';
import { MessageSquare, Activity, Settings, TestTube, FileCode } from 'lucide-react';
import type { AttributionPrefs, AttributionPrefsUpdate } from '../../core/attribution-api';
import type { SessionExcerpt, TestRun, TraceCommitSummary, TraceCollectorStatus, TraceCollectorConfig, TraceRange } from '../../core/types';
import { SessionExcerpts } from './SessionExcerpts';
import { TraceTranscriptPanel } from './TraceTranscriptPanel';
import { AgentTraceSummary } from './AgentTraceSummary';
import { CodexOtelSettingsPanel } from './CodexOtelSettingsPanel';
import { AutoIngestSetupPanel } from './AutoIngestSetupPanel';
import { TestResultsPanel } from './TestResultsPanel';
import { DiffViewer } from './DiffViewer';
import { SourceLensView } from './SourceLensView';
import type { IngestConfig, OtlpEnvStatus } from '../../core/tauri/ingestConfig';

type TabId = 'session' | 'attribution' | 'settings' | 'tests';

interface TabConfig {
  id: TabId;
  label: string;
  icon: typeof MessageSquare;
}

const TABS: TabConfig[] = [
  { id: 'session', label: 'Session', icon: MessageSquare },
  { id: 'attribution', label: 'AI Attribution', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'tests', label: 'Tests', icon: TestTube },
];

interface RightPanelTabsProps {
  // Session data
  sessionExcerpts?: SessionExcerpt[];
  selectedFile: string | null;
  onFileClick: (path: string) => void;
  onUnlinkSession?: (sessionId: string) => void;
  onCommitClick: (commitSha: string) => void;
  selectedCommitId: string | null;

  // Attribution data
  traceSummary?: TraceCommitSummary;
  traceStatus?: TraceCollectorStatus;
  hasFiles: boolean;
  onExportAgentTrace?: () => void;
  onRunOtlpSmokeTest?: () => void;

  // Settings data
  traceConfig?: TraceCollectorConfig;
  onUpdateCodexOtelPath?: (path: string) => void;
  onToggleCodexOtelReceiver?: (enabled: boolean) => void;
  onOpenCodexOtelDocs?: () => void;
  codexPromptExport?: { enabled: boolean | null; configPath: string | null };
  attributionPrefs?: AttributionPrefs | null;
  onUpdateAttributionPrefs?: (update: AttributionPrefsUpdate) => void;
  onPurgeAttributionMetadata?: () => void;
  ingestConfig?: IngestConfig | null;
  otlpEnvStatus?: OtlpEnvStatus | null;
  onToggleAutoIngest?: (enabled: boolean) => void;
  onUpdateWatchPaths?: (paths: { claude: string[]; cursor: string[] }) => void;
  onConfigureCodex?: () => void;
  onGrantCodexConsent?: () => void;

  // Test data
  testRun?: TestRun;
  onTestFileClick: (path: string) => void;

  // Diff data
  selectedCommitSha: string | null;
  repoId?: number;
  diffText: string | null;
  loadingDiff: boolean;
  traceRanges: TraceRange[];
}

export function RightPanelTabs(props: RightPanelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('session');
  const [diffExpanded, setDiffExpanded] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const {
    sessionExcerpts,
    selectedFile,
    onFileClick,
    onUnlinkSession,
    onCommitClick,
    selectedCommitId,
    traceSummary,
    traceStatus,
    hasFiles,
    onExportAgentTrace,
    onRunOtlpSmokeTest,
    traceConfig,
    onUpdateCodexOtelPath,
    onToggleCodexOtelReceiver,
    onOpenCodexOtelDocs,
    codexPromptExport,
    attributionPrefs,
    onUpdateAttributionPrefs,
    onPurgeAttributionMetadata,
    ingestConfig,
    otlpEnvStatus,
    onToggleAutoIngest,
    onUpdateWatchPaths,
    onConfigureCodex,
    onGrantCodexConsent,
    testRun,
    onTestFileClick,
    selectedCommitSha,
    repoId,
    diffText,
    loadingDiff,
    traceRanges,
  } = props;

  // Determine which tabs have content
  const hasSessionContent = sessionExcerpts && sessionExcerpts.length > 0;
  const hasAttributionContent = traceSummary || traceStatus;
  const hasTestContent = testRun && testRun.tests.length > 0;

  // Auto-switch to attribution tab if no session but has attribution
  // This is a one-time effect that runs when content becomes available
  const effectiveTab = (() => {
    if (activeTab === 'session' && !hasSessionContent && hasAttributionContent) {
      return 'attribution';
    }
    return activeTab;
  })();

  const tabIds = TABS.map((tab) => tab.id);

  useEffect(() => {
    if (!sessionExcerpts || sessionExcerpts.length === 0) {
      setSelectedSessionId(null);
      return;
    }
    if (!selectedSessionId || !sessionExcerpts.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(sessionExcerpts[0]?.id ?? null);
    }
  }, [sessionExcerpts, selectedSessionId]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabIds.indexOf(effectiveTab);
    if (currentIndex === -1) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % tabIds.length;
        setActiveTab(tabIds[nextIndex]);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
        setActiveTab(tabIds[nextIndex]);
        break;
      }
      case 'Home':
        event.preventDefault();
        setActiveTab(tabIds[0]);
        break;
      case 'End':
        event.preventDefault();
        setActiveTab(tabIds[tabIds.length - 1]);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Tab Navigation */}
      <div className="card p-2">
        <div className="flex gap-1" role="tablist" aria-label="Right panel tabs" onKeyDown={handleTabKeyDown}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = effectiveTab === tab.id;
            const hasContent =
              (tab.id === 'session' && hasSessionContent) ||
              (tab.id === 'attribution' && hasAttributionContent) ||
              (tab.id === 'tests' && hasTestContent) ||
              tab.id === 'settings';

            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-sky-100 text-sky-700'
                    : 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
                  }
                  ${!hasContent && tab.id !== 'settings' ? 'opacity-60' : ''}
                `}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                role="tab"
                tabIndex={isActive ? 0 : -1}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {effectiveTab === 'session' && (
          <div id="panel-session" role="tabpanel" aria-labelledby="tab-session" className="flex flex-col gap-4">
            <SessionExcerpts
              excerpts={sessionExcerpts}
              selectedFile={selectedFile}
              onFileClick={onFileClick}
              onUnlink={onUnlinkSession}
              onCommitClick={onCommitClick}
              selectedCommitId={selectedCommitId}
              selectedSessionId={selectedSessionId}
              onSelectSession={setSelectedSessionId}
            />

            {hasAttributionContent ? (
              <div className="card px-4 py-3 flex flex-col gap-2 text-xs text-text-secondary">
                <div className="font-semibold text-text-secondary">Looking for line attribution?</div>
                <div className="text-text-tertiary">
                  Source Lens lives in the AI Attribution tab and shows suggested, line-by-line influence.
                  {!selectedFile ? ' Select a file in the diff to unlock it.' : ''}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('attribution')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-page text-text-secondary hover:bg-border-light transition-colors"
                  >
                    Open AI Attribution
                  </button>
                </div>
              </div>
            ) : null}

            <TraceTranscriptPanel
              excerpt={sessionExcerpts?.find((s) => s.id === selectedSessionId)}
              selectedFile={selectedFile}
              onFileClick={onFileClick}
            />
          </div>
        )}

        {effectiveTab === 'attribution' && (
          <div
            id="panel-attribution"
            role="tabpanel"
            aria-labelledby="tab-attribution"
            className="flex flex-col gap-4"
          >
            <AgentTraceSummary
              summary={traceSummary}
              hasFiles={hasFiles}
              status={traceStatus}
              onExport={onExportAgentTrace}
              onSmokeTest={onRunOtlpSmokeTest}
            />

            <div>
              <div className="section-header">SOURCE LENS</div>
              <div className="section-subheader mt-0.5">
                Line-by-line attribution for the selected file
              </div>
              <div className="text-xs text-text-tertiary">
                Use this to verify AI-influenced lines. Suggested only — confirm before citing or sharing.
              </div>
            </div>

            {repoId && selectedCommitSha && selectedFile ? (
              <SourceLensView
                repoId={repoId}
                commitSha={selectedCommitSha}
                filePath={selectedFile}
                prefsOverride={attributionPrefs}
                showHeader={false}
              />
            ) : (
              <div className="card p-5 text-sm text-text-tertiary">
                Select a file in the diff to see Source Lens attribution.
              </div>
            )}
          </div>
        )}

        {effectiveTab === 'settings' && (
          <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
            <AutoIngestSetupPanel
              config={ingestConfig ?? null}
              otlpEnv={otlpEnvStatus ?? null}
              onToggleAutoIngest={(enabled) => onToggleAutoIngest?.(enabled)}
              onUpdateWatchPaths={(paths) => onUpdateWatchPaths?.(paths)}
              onConfigureCodex={() => onConfigureCodex?.()}
              onGrantConsent={() => onGrantCodexConsent?.()}
            />
            <CodexOtelSettingsPanel
              traceConfig={traceConfig}
              onUpdateCodexOtelPath={onUpdateCodexOtelPath}
              onToggleCodexOtelReceiver={onToggleCodexOtelReceiver}
              onOpenCodexOtelDocs={onOpenCodexOtelDocs}
              logUserPromptEnabled={codexPromptExport?.enabled ?? null}
              logUserPromptConfigPath={codexPromptExport?.configPath ?? null}
              attributionPrefs={attributionPrefs}
              onUpdateAttributionPrefs={onUpdateAttributionPrefs}
              onPurgeAttributionMetadata={onPurgeAttributionMetadata}
            />
          </div>
        )}

        {effectiveTab === 'tests' && (
          <div id="panel-tests" role="tabpanel" aria-labelledby="tab-tests">
            <TestResultsPanel testRun={testRun} onFileClick={onTestFileClick} />
          </div>
        )}

      </div>

      {/* Diff Viewer - Always visible at bottom */}
      <div className="flex-none">
        <button
          type="button"
          onClick={() => setDiffExpanded(!diffExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-bg-page hover:bg-border-light rounded-t-lg text-xs font-medium text-text-secondary transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5" />
            {selectedFile ? selectedFile.split('/').pop() : 'Diff'}
          </span>
          <span>{diffExpanded ? '▼' : '▲'}</span>
        </button>
        {diffExpanded && (
          <div className="card rounded-t-none border-t-0 max-h-[400px] overflow-auto">
            <DiffViewer
              title=""
              diffText={diffText}
              loading={loadingDiff}
              traceRanges={traceRanges}
            />
          </div>
        )}
      </div>
    </div>
  );
}
