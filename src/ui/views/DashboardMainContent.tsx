import { Box, File, FileCode, FileText, Palette } from 'lucide-react';
import { useMemo } from 'react';

import { formatToolName, type DashboardStats, type TimeRange } from '../../core/attribution-api';
import type { DashboardFilter, DashboardTrustState, PanelStatusMap } from '../../core/types';
import { trackDashboardEvent } from '../../core/telemetry/narrativeTelemetry';
import type { RepoState } from '../../hooks/useRepoLoader';
import { BottomStats } from '../components/dashboard/BottomStats';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { QuickActions } from '../components/dashboard/QuickActions';
import { RecentActivity, type ActivityItem } from '../components/dashboard/RecentActivity';
import { TopFilesTable } from '../components/dashboard/TopFilesTable';

interface DashboardMainContentProps {
  stats: DashboardStats;
  repoState: RepoState;
  timeRange: TimeRange;
  lastUpdated?: Date;
  dashboardTrustState: DashboardTrustState;
  panelStatusMap: PanelStatusMap;
  activeRepoId: number | null;
  visibleFiles: DashboardStats['topFiles']['files'];
  loadingMore: boolean;
  hasActiveQuery: boolean;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  onImportSession: () => void;
  onModeChange: (mode: 'repo' | 'hygiene') => void;
  onFileClick: (filter: DashboardFilter) => void;
  onLoadMore: () => void;
}

export function DashboardMainContent({
  stats,
  repoState,
  timeRange,
  lastUpdated,
  dashboardTrustState,
  panelStatusMap,
  activeRepoId,
  visibleFiles,
  loadingMore,
  hasActiveQuery,
  onTimeRangeChange,
  onImportSession,
  onModeChange,
  onFileClick,
  onLoadMore,
}: DashboardMainContentProps) {
  const topTool = stats.currentPeriod.toolBreakdown[0];
  const topToolLabel = topTool ? formatToolName(topTool.tool) : 'Codex';
  const narrativeWindowLabel = typeof stats.timeRange === 'string' ? stats.timeRange.toUpperCase() : 'CUSTOM';
  const evidenceFileCount = stats.topFiles.total;
  const nextMoveLabel = dashboardTrustState === 'healthy' ? 'Open repo evidence' : 'Review trust center';

  const recentActivityItems: ActivityItem[] = useMemo(() => {
    return stats.topFiles.files.slice(0, 5).map((file) => {
      const badge = file.aiPercentage > 80 ? 'ai' as const
        : file.aiPercentage > 20 ? 'mixed' as const
          : 'human' as const;

      const ext = file.filePath.split('.').pop()?.toLowerCase() || '';
      let icon = File;
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) icon = FileCode;
      if (['css', 'scss', 'html'].includes(ext)) icon = Palette;
      if (['md', 'txt'].includes(ext)) icon = FileText;
      if (['json', 'yaml', 'yml'].includes(ext)) icon = Box;

      const fileName = file.filePath.split('/').pop();
      return {
        id: file.filePath,
        message: `Updated ${fileName}`,
        branch: file.filePath,
        timeAgo: 'Recently',
        badge,
        icon,
      };
    });
  }, [stats.topFiles.files]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="dashboard-container h-full min-h-0 flex flex-col animate-in fade-in slide-in-from-bottom-1 motion-page-enter">
      <DashboardHeader
        repoName={stats.repo.name}
        repoPath={stats.repo.path}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        lastUpdated={lastUpdated}
        trustState={dashboardTrustState}
      />

      <main className="flex-1 overflow-y-auto px-6 py-6" data-dashboard-content>
        <div className="max-w-6xl">
          <section className="mb-6 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-violet-light bg-accent-violet/10 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-accent-violet">
              Narrative Brief
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                  {greeting}. {stats.repo.name} is telling a {dashboardTrustState === 'healthy' ? 'grounded' : 'partial'} story.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  This window covers {stats.currentPeriod.period.commits} commits, {stats.currentPeriod.attribution.totalLines.toLocaleString()} attributed lines, and {evidenceFileCount} high-signal files. {topToolLabel} is the primary captured tool in the current view.
                </p>
              </div>
              <div className="inline-flex items-center rounded-full border border-border-light bg-bg-secondary px-3 py-1 text-xs text-text-secondary">
                Codex-first shell phase
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <article className="glass-panel rounded-2xl p-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Story Window</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{stats.currentPeriod.period.commits} commits in {narrativeWindowLabel}</p>
                <p className="mt-1 text-sm text-text-secondary">Use this as the narrative frame before drilling into individual files.</p>
              </article>
              <article className="glass-panel rounded-2xl p-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Evidence Coverage</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{evidenceFileCount} files with attribution evidence</p>
                <p className="mt-1 text-sm text-text-secondary">These are the highest-signal surfaces for reconstructing what changed and why.</p>
              </article>
              <article className="glass-panel rounded-2xl p-4">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-text-muted">Next Move</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">{nextMoveLabel}</p>
                <p className="mt-1 text-sm text-text-secondary">Stay anchored in repo evidence first, then move outward into hygiene or documentation.</p>
              </article>
            </div>
          </section>

          <div data-panel-status={panelStatusMap.metrics}>
            <MetricsGrid
              currentPeriod={stats.currentPeriod}
              previousPeriod={stats.previousPeriod}
              toolBreakdown={stats.currentPeriod.toolBreakdown}
            />
          </div>

          <QuickActions
            repoName={stats.repo.name}
            branchName={repoState.status === 'ready' ? repoState.repo.branch : undefined}
            onOpenEvidence={() => onModeChange('repo')}
            onImportSession={onImportSession}
            onReviewHygiene={() => onModeChange('hygiene')}
          />

          <div className="mb-6">
            <RecentActivity
              items={recentActivityItems}
              onViewAll={() => {
                trackDashboardEvent({ event: 'view_activity', payload: { repo_id: activeRepoId } });
                onModeChange('repo');
              }}
              onItemClick={onFileClick}
            />
          </div>
          <div data-panel-status={panelStatusMap.topFiles} className="mb-6">
            <TopFilesTable
              files={visibleFiles}
              hasMore={!hasActiveQuery && stats.topFiles.hasMore}
              isLoading={loadingMore}
              onFileClick={onFileClick}
              onLoadMore={onLoadMore}
            />
          </div>
        </div>
      </main>

      <BottomStats
        repoCount={1}
        sessionCount={stats.currentPeriod.period.commits}
        aiPercentage={Math.round(stats.currentPeriod.attribution.aiPercentage)}
      />
    </div>
  );
}
