import { type KeyboardEvent, useEffect, useState, Fragment } from 'react';
import { MessageSquare, Activity, Settings, TestTube, FileCode, Search, PictureInPicture2, Minimize2, ChevronDown } from 'lucide-react';
import { useTheme } from '@design-studio/tokens';
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
import { Select } from './Select';

type TabId = 'session' | 'attribution' | 'atlas' | 'settings' | 'tests';
type TabCategory = 'analyze' | 'tools' | 'config';

interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof MessageSquare;
  category: TabCategory;
}

const TAB_ACTIVE_STYLES: Record<TabId, string> = {
  session: 'bg-accent-violet-bg text-accent-violet',
  attribution: 'bg-accent-green-bg text-accent-green',
  atlas: 'bg-accent-blue-bg text-accent-blue',
  tests: 'bg-accent-amber-bg text-accent-amber',
  settings: 'bg-bg-tertiary text-text-secondary',
};

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

function DevThemeToggleCard() {
  const { theme, setTheme, effectiveTheme } = useTheme();

  return (
    <div className="card p-5 mb-4">
      <div className="section-header">THEME</div>
      <div className="section-subheader mt-0.5">dev-only override</div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs font-semibold text-text-secondary">
          Mode
        </span>
        <Select
          aria-label="Theme mode"
          value={theme}
          onValueChange={(v) => setTheme(v as 'system' | 'light' | 'dark')}
          items={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <div className="text-[11px] text-text-tertiary">
          Effective: <span className="font-mono">{effectiveTheme}</span>
        </div>
      </div>
    </div>
  );
}

export function RightPanelTabs(props: RightPanelTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('session');
  const [diffExpanded, setDiffExpanded] = useState(true);
  const [diffPip, setDiffPip] = useState(false);
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

    // Prefer a session that is linked to the currently selected commit (when available).
    // This makes auto-ingested sessions feel "attached" to the repo timeline by default.
    if (selectedCommitId) {
      const linked = sessionExcerpts.find((s) => s.linkedCommitSha === selectedCommitId);
      if (linked && linked.id !== selectedSessionId) {
        setSelectedSessionId(linked.id);
        return;
      }
    }

    if (!selectedSessionId || !sessionExcerpts.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(sessionExcerpts[0]?.id ?? null);
    }
  }, [sessionExcerpts, selectedSessionId, selectedCommitId]);

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
    <div className="relative flex flex-col h-full gap-4">
      {/* Tab Navigation - Grouped by category with visual separators */}
      <div className="card p-2">
        <div className="flex items-center gap-1" role="tablist" aria-label="Right panel tabs" onKeyDown={handleTabKeyDown}>
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
                  <div className="w-px h-5 bg-border-light mx-1" aria-hidden="true" />
                )}
                <button
                  id={`tab-${tab.id}`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    min-w-0 flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2
                    text-[10px] leading-4 font-medium whitespace-nowrap
                    transition-all duration-150
                    ${isActive
                      ? TAB_ACTIVE_STYLES[tab.id]
                      : 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
                    }
                    ${!hasContent && tab.id !== 'settings' ? 'opacity-60' : ''}
                  `}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  title={tab.label}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{tab.shortLabel}</span>
                </button>
              </Fragment>
            );
          })}
        </div>
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-primary text-text-secondary hover:bg-border-light transition-colors"
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
            <div className="card mb-4 p-4">
              <div className="section-header">COLOR SEMANTICS</div>
              <div className="section-subheader mt-0.5">visual language</div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                <span className="rounded-full border border-accent-green-light bg-accent-green-bg px-2 py-0.5 text-accent-green">AI</span>
                <span className="rounded-full border border-accent-violet-light bg-accent-violet-bg px-2 py-0.5 text-accent-violet">Human</span>
                <span className="rounded-full border border-accent-amber-light bg-accent-amber-bg px-2 py-0.5 text-accent-amber">Mixed</span>
                <span className="rounded-full border border-border-light bg-bg-tertiary px-2 py-0.5 text-text-tertiary">Unknown</span>
                <span className="rounded-full border border-accent-red-light bg-accent-red-bg px-2 py-0.5 text-accent-red">Failed tests</span>
              </div>
            </div>
            {import.meta.env.DEV ? <DevThemeToggleCard /> : null}
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
          className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-bg-primary hover:bg-border-light rounded-t-lg text-xs font-medium text-text-secondary transition-colors"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileCode className="w-3.5 h-3.5" />
            <span className="truncate">{selectedFile ? selectedFile.split('/').pop() : 'Diff'}</span>
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center rounded-md border border-border-light bg-bg-secondary px-1.5 py-1 text-[10px] text-text-tertiary hover:bg-bg-hover"
              onClick={(event) => {
                event.stopPropagation();
                setDiffPip((v) => !v);
                setDiffExpanded(true);
              }}
              title={diffPip ? 'Dock diff panel' : 'Pop out diff panel'}
              aria-label={diffPip ? 'Dock diff panel' : 'Pop out diff panel'}
            >
              {diffPip ? <Minimize2 className="h-3 w-3" /> : <PictureInPicture2 className="h-3 w-3" />}
            </button>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${diffExpanded ? '' : '-rotate-90'}`} />
          </span>
        </button>
        {diffExpanded && !diffPip && (
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

      {diffExpanded && diffPip && (
        <div className="absolute bottom-4 right-4 z-20 w-[min(640px,95%)] max-h-[55vh] animate-in fade-in slide-in-from-bottom-2 motion-page-enter">
          <div className="overflow-hidden rounded-xl border border-border-light bg-bg-secondary shadow-lg">
            <div className="flex items-center justify-between border-b border-border-light px-3 py-2 text-xs text-text-secondary">
              <span className="min-w-0 truncate font-medium">
                {selectedFile ? selectedFile.split('/').pop() : 'Diff'}
              </span>
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-border-light bg-bg-tertiary px-2 py-1 text-[10px] hover:bg-bg-hover"
                onClick={() => setDiffPip(false)}
              >
                Dock
              </button>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              <DiffViewer
                title=""
                diffText={diffText}
                loading={loadingDiff}
                traceRanges={traceRanges}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
