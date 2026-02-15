import { type KeyboardEvent, useEffect, useState, Fragment } from 'react';
import { MessageSquare, Activity, Settings, TestTube, FileCode, Search } from 'lucide-react';
import type { AttributionPrefs, AttributionPrefsUpdate } from '../../core/attribution-api';
import type { SessionExcerpt, TestRun, TraceCommitSummary, TraceCollectorStatus, TraceCollectorConfig, TraceRange } from '../../core/types';
import { SessionExcerpts } from './SessionExcerpts';
import { TraceTranscriptPanel } from './TraceTranscriptPanel';
import { AgentTraceSummary } from './AgentTraceSummary';
import { CodexOtelSettingsPanel } from './CodexOtelSettingsPanel';
import { StoryAnchorsPanel } from './StoryAnchorsPanel';
import { AutoIngestSetupPanel } from './AutoIngestSetupPanel';
import { TestResultsPanel } from './TestResultsPanel';
import { DiffViewer } from './DiffViewer';
import { SourceLensView } from './SourceLensView';
import { StepsSummaryCard } from './StepsSummaryCard';
import { AtlasSearchPanel } from './AtlasSearchPanel';
import type { DiscoveredSources, IngestConfig, OtlpKeyStatus } from '../../core/tauri/ingestConfig';

type TabId = 'session' | 'attribution' | 'atlas' | 'settings' | 'tests';
type TabCategory = 'analyze' | 'tools' | 'config';

interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof MessageSquare;
  category: TabCategory;
}

const TABS: TabConfig[] = [
  { id: 'session', label: 'Session', shortLabel: 'Session', icon: MessageSquare, category: 'analyze' },
  { id: 'attribution', label: 'AI Attribution', shortLabel: 'Attribution', icon: Activity, category: 'analyze' },
  { id: 'atlas', label: 'Atlas Search', shortLabel: 'Atlas', icon: Search, category: 'tools' },
  { id: 'tests', label: 'Tests', shortLabel: 'Tests', icon: TestTube, category: 'tools' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, category: 'config' },
];

interface RightPanelTabsProps {
  // Session data
  sessionExcerpts?: SessionExcerpt[];
  selectedFile: string | null;
  onFileClick: (path: string) => void;
  onUnlinkSession?: (sessionId: string) => void;
  onCommitClick: (commitSha: string) => void;
  selectedCommitId: string | null;
  repoRoot?: string;
  changedFiles?: string[];

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
  otlpKeyStatus?: OtlpKeyStatus | null;
  discoveredSources?: DiscoveredSources | null;
  onToggleAutoIngest?: (enabled: boolean) => void;
  onUpdateWatchPaths?: (paths: { claude: string[]; cursor: string[]; codexLogs: string[] }) => void;
  onConfigureCodex?: () => void;
  onRotateOtlpKey?: () => void;
  onGrantCodexConsent?: () => void;

  // Test data
  testRun?: TestRun;
  onTestFileClick: (path: string) => void;
  loadingTests?: boolean;
  onImportJUnit?: () => void;

  // Diff data
  selectedCommitSha: string | null;
  repoId?: number;
  indexedCommitShas?: string[] | null;
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
    repoRoot,
    changedFiles,
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
    otlpKeyStatus,
    discoveredSources,
    onToggleAutoIngest,
    onUpdateWatchPaths,
    onConfigureCodex,
    onRotateOtlpKey,
    onGrantCodexConsent,
    testRun,
    onTestFileClick,
    loadingTests,
    onImportJUnit,
    selectedCommitSha,
    repoId,
    indexedCommitShas,
    diffText,
    loadingDiff,
    traceRanges,
  } = props;

  // Determine which tabs have content
  const hasSessionContent = sessionExcerpts && sessionExcerpts.length > 0;
  const hasAttributionContent = traceSummary || traceStatus;
  // Atlas tab is always enabled; the panel itself shows a repo-required empty state when repoId is null.
  const hasAtlasContent = true;
  const hasTestContent = Boolean(testRun) || Boolean(selectedCommitSha);

  // Use active tab directly - no auto-switch to prevent jarring UX
  // Users can manually switch between tabs
  const effectiveTab = activeTab;

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
      {/* Tab Navigation - Clean inline style */}
      <div 
        className="flex gap-1 items-center px-1 py-1 bg-bg-card border-b border-border-light" 
        role="tablist" 
        aria-label="Right panel tabs" 
        onKeyDown={handleTabKeyDown}
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = effectiveTab === tab.id;
          const hasContent =
            (tab.id === 'session' && hasSessionContent) ||
            (tab.id === 'attribution' && hasAttributionContent) ||
            (tab.id === 'atlas' && hasAtlasContent) ||
            (tab.id === 'tests' && hasTestContent) ||
            tab.id === 'settings';

          // Check if we need a separator before this tab (category change)
          const prevTab = index > 0 ? TABS[index - 1] : null;
          const needsSeparator = prevTab && prevTab.category !== tab.category;

          return (
            <Fragment key={tab.id}>
              {needsSeparator && (
                <div className="w-px h-4 bg-border-light mx-1" aria-hidden="true" />
              )}
              <button
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium
                  transition-all duration-150 min-w-0
                  ${isActive
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
                  }
                  ${!hasContent && tab.id !== 'settings' ? 'opacity-50' : ''}
                `}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                title={tab.label}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.shortLabel}</span>
              </button>
            </Fragment>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {effectiveTab === 'session' && (
          <div id="panel-session" role="tabpanel" aria-labelledby="tab-session" className="flex flex-col gap-4">
            {repoId && repoRoot && selectedCommitSha ? (
              <StepsSummaryCard
                repoId={repoId}
                repoRoot={repoRoot}
                commitSha={selectedCommitSha}
                traceSummary={traceSummary}
              />
            ) : null}

            <SessionExcerpts
              excerpts={sessionExcerpts}
              selectedFile={selectedFile}
              onFileClick={onFileClick}
              onUnlink={onUnlinkSession}
              onCommitClick={onCommitClick}
              selectedCommitId={selectedCommitId}
              selectedSessionId={selectedSessionId}
              onSelectSession={setSelectedSessionId}
              repoRoot={repoRoot}
              changedFiles={changedFiles}
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
              <div className="section-subheader">
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

        {effectiveTab === 'atlas' && (
          <div id="panel-atlas" role="tabpanel" aria-labelledby="tab-atlas" className="flex flex-col gap-4">
            <AtlasSearchPanel repoId={repoId ?? null} />
          </div>
        )}

        {effectiveTab === 'settings' && (
          <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
            <AutoIngestSetupPanel
              config={ingestConfig ?? null}
              otlpKey={otlpKeyStatus ?? null}
              sources={discoveredSources ?? null}
              onToggleAutoIngest={(enabled) => onToggleAutoIngest?.(enabled)}
              onUpdateWatchPaths={(paths) => onUpdateWatchPaths?.(paths)}
              onConfigureCodex={() => onConfigureCodex?.()}
              onRotateOtlpKey={() => onRotateOtlpKey?.()}
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
            <StoryAnchorsPanel
              repoId={repoId ?? null}
              repoRoot={repoRoot ?? null}
              selectedCommitSha={selectedCommitSha}
              indexedCommitShas={indexedCommitShas ?? null}
            />
          </div>
        )}

        {effectiveTab === 'tests' && (
          <div id="panel-tests" role="tabpanel" aria-labelledby="tab-tests">
            <TestResultsPanel
              testRun={testRun}
              onFileClick={onTestFileClick}
              selectedCommitSha={selectedCommitSha}
              onImportJUnit={onImportJUnit}
              loading={loadingTests}
              repoRoot={repoRoot}
              changedFiles={changedFiles}
            />
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
