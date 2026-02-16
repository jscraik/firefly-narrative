import { useCallback, useEffect, useState } from 'react';
import type { RepoState } from '../../hooks/useRepoLoader';
import {
  getDashboardStats,
  timeRangeToDateRange,
  type DashboardStats,
  type TimeRange,
  type DashboardEmptyReason,
} from '../../core/attribution-api';
import type { DashboardFilter } from '../../core/types';
import type { Mode } from '../components/TopNav';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardEmptyState } from '../components/dashboard/DashboardEmptyState';
import { MetricsGrid } from '../components/dashboard/MetricsGrid';
import { DashboardLoadingState } from '../components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '../components/dashboard/DashboardErrorState';
import { TopFilesTable } from '../components/dashboard/TopFilesTable';

interface DashboardViewProps {
  repoState: RepoState;
  setRepoState: React.Dispatch<React.SetStateAction<RepoState>>;
  setActionError: (error: string | null) => void;
  onDrillDown: (filter: DashboardFilter) => void;
  onModeChange: (mode: Mode) => void;
}

export function DashboardView({
  repoState,
  setRepoState: _setRepoState,
  setActionError,
  onDrillDown,
  onModeChange: _onModeChange,
}: DashboardViewProps) {
  // Helper to get repo name from path
  const getRepoName = (path: string): string => {
    return path.split('/').filter(Boolean).pop() || path;
  };
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filesOffset, setFilesOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [emptyReason, setEmptyReason] = useState<DashboardEmptyReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  // Fetch stats on repo/timeRange change
  const fetchStats = useCallback(async (isLoadMore = false) => {
    if (repoState.status !== 'ready') {
      setEmptyReason('no-repo');
      setLoading(false);
      return;
    }

    // Only set main loading state for initial load
    if (!isLoadMore) {
      setLoading(true);
    }
    setLoadingMore(true);
    setError(null);

    try {
      const data = await getDashboardStats(
        repoState.repo.repoId,
        timeRange,
        filesOffset,
        20
      );

      // Determine empty state
      if (data.currentPeriod.period.commits === 0) {
        setEmptyReason('no-commits');
      } else if (data.currentPeriod.attribution.aiPercentage === 0) {
        setEmptyReason('no-ai');
      } else if (!data.topFiles.files.length) {
        setEmptyReason('no-attribution');
      } else {
        setEmptyReason(null);
      }

      setStats(data);
      setLastUpdated(new Date());
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to load dashboard';
      setError(errorMessage);
      setActionError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [repoState, timeRange, filesOffset, setActionError]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Drill-down navigation - switch to repo mode with filter
  const handleDrillDown = useCallback(
    (filter: DashboardFilter) => {
      // Add dateRange to filter if not provided
      const filterWithDate: DashboardFilter = {
        ...filter,
        dateRange: filter.dateRange || timeRangeToDateRange(timeRange),
      };
      onDrillDown(filterWithDate);
    },
    [onDrillDown, timeRange]
  );

  // Handle time range change
  const handleTimeRangeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    setFilesOffset(0); // Reset pagination on time range change
  }, []);

  // Handle load more with loading state
  const handleLoadMoreWithState = useCallback(async () => {
    setFilesOffset((prev) => prev + 20);
    // fetchStats will be called by the useEffect when filesOffset changes
  }, []);

  if (repoState.status !== 'ready') {
    return <DashboardEmptyState reason="no-repo" />;
  }

  if (error) {
    return <DashboardErrorState error={error} onRetry={fetchStats} />;
  }

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (emptyReason) {
    return (
      <div className="dashboard-container">
        <DashboardHeader
          repoName={getRepoName(repoState.repo.root)}
          repoPath={repoState.repo.root}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          lastUpdated={lastUpdated}
        />
        <DashboardEmptyState reason={emptyReason} />
      </div>
    );
  }

  if (!stats) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="dashboard-container h-full min-h-0 overflow-y-auto bg-bg-page">
      <DashboardHeader
        repoName={stats.repo.name}
        repoPath={stats.repo.path}
        timeRange={stats.timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        lastUpdated={lastUpdated}
      />

      <main className="px-6 py-6" data-dashboard-content>
        {/* Metrics Grid */}
        <MetricsGrid
          currentPeriod={stats.currentPeriod}
          previousPeriod={stats.previousPeriod}
          toolBreakdown={stats.currentPeriod.toolBreakdown}
        />

        {/* Top Files Table */}
        <TopFilesTable
          files={stats.topFiles.files}
          hasMore={stats.topFiles.hasMore}
          isLoading={loadingMore}
          onFileClick={handleDrillDown}
          onLoadMore={handleLoadMoreWithState}
        />
      </main>
    </div>
  );
}
