import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDashboardStats,
  timeRangeToDateRange,
  type DashboardEmptyReason,
  type DashboardStats,
  type TimeRange,
} from "../../core/attribution-api";
import type {
  DashboardDroppedRequestDiagnostic,
  DashboardFilter,
  DashboardRequestFailureMetadata,
  DashboardState,
  PanelStatusMap,
} from "../../core/types";
import type { CaptureReliabilityStatus } from "../../core/tauri/ingestConfig";
import type { RepoState } from "../../hooks/useRepoLoader";
import type { Mode } from "../components/TopNav";
import { DashboardEmptyState } from "../components/dashboard/DashboardEmptyState";
import { DashboardErrorState } from "../components/dashboard/DashboardErrorState";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { DashboardLoadingState } from "../components/dashboard/DashboardLoadingState";
import { MetricsGrid } from "../components/dashboard/MetricsGrid";
import { TopFilesTable } from "../components/dashboard/TopFilesTable";
import {
  classifyDashboardFailure,
  DASHBOARD_CHORD_TIMEOUT_MS,
  DASHBOARD_DROPPED_REQUEST_LIMIT,
  DASHBOARD_DROPPED_REQUEST_TTL_MS,
  deriveDashboardTrustState,
  hashDashboardRequestKey,
} from "./dashboardState";

interface DashboardViewProps {
  repoState: RepoState;
  setRepoState: React.Dispatch<React.SetStateAction<RepoState>>;
  setActionError: (error: string | null) => void;
  onDrillDown: (filter: DashboardFilter) => void;
  onModeChange: (mode: Mode) => void;
  captureReliabilityStatus?: CaptureReliabilityStatus | null;
}

function getRepoName(path: string): string {
  return path.split("/").filter(Boolean).pop() || path;
}

export function DashboardView({
  repoState,
  setRepoState: _setRepoState,
  setActionError,
  onDrillDown,
  onModeChange,
  captureReliabilityStatus,
}: DashboardViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [filesOffset, setFilesOffset] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [emptyReason, setEmptyReason] = useState<DashboardEmptyReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [commandQuery, setCommandQuery] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const sequenceRef = useRef<{ lastKey: string; ts: number }>({ lastKey: "", ts: 0 });
  const fetchRequestVersionRef = useRef(0);
  const activeRequestRef = useRef<{
    version: number;
    repoId: number;
    requestKeyHash: string;
    attempt: number;
  } | null>(null);
  const failureMetadataRef = useRef<DashboardRequestFailureMetadata | null>(null);
  const droppedRequestDiagnosticsRef = useRef<DashboardDroppedRequestDiagnostic[]>([]);

  const dashboardTrustState = useMemo(
    () => deriveDashboardTrustState(captureReliabilityStatus),
    [captureReliabilityStatus],
  );
  const activeRepoId = repoState.status === "ready" ? repoState.repo.repoId : null;

  const panelStatusMap = useMemo<PanelStatusMap>(
    () => ({
      metrics:
        dashboardState === "loading"
          ? "loading"
          : dashboardTrustState === "degraded"
            ? "degraded"
            : "ready",
      topFiles:
        dashboardState === "loading"
          ? "loading"
          : emptyReason === "no-attribution"
            ? "empty"
            : dashboardTrustState === "degraded"
              ? "degraded"
              : "ready",
    }),
    [dashboardState, dashboardTrustState, emptyReason],
  );

  const recordDroppedRequest = useCallback(
    (entry: DashboardDroppedRequestDiagnostic) => {
      const now = Date.now();
      const retainedEntries = droppedRequestDiagnosticsRef.current
        .filter((diagnostic) => now - Date.parse(diagnostic.droppedAtIso) <= DASHBOARD_DROPPED_REQUEST_TTL_MS)
        .concat(entry);
      droppedRequestDiagnosticsRef.current = retainedEntries.slice(
        -DASHBOARD_DROPPED_REQUEST_LIMIT,
      );
    },
    [],
  );

  const fetchStats = useCallback(
    async (isLoadMore = false) => {
      if (repoState.status !== "ready") {
        setEmptyReason("no-repo");
        setError(null);
        setCanRetry(true);
        setDashboardState("empty");
        setLoadingMore(false);
        activeRequestRef.current = null;
        return;
      }

      const requestVersion = fetchRequestVersionRef.current + 1;
      fetchRequestVersionRef.current = requestVersion;
      const requestKeyHash = hashDashboardRequestKey({
        repoId: repoState.repo.repoId,
        timeRange:
          typeof timeRange === "string" ? timeRange : `${timeRange.from}:${timeRange.to}`,
        filesOffset,
      });
      const priorFailureAttempt =
        failureMetadataRef.current?.repoId === repoState.repo.repoId &&
        failureMetadataRef.current.requestKeyHash === requestKeyHash
          ? failureMetadataRef.current.attempt
          : 0;
      const requestMeta = {
        version: requestVersion,
        repoId: repoState.repo.repoId,
        requestKeyHash,
        attempt: isLoadMore ? 1 : priorFailureAttempt + 1,
      };
      const isStaleRequest = (reason: DashboardDroppedRequestDiagnostic["reason"]) => {
        if (fetchRequestVersionRef.current !== requestVersion) {
          recordDroppedRequest({
            repoId: requestMeta.repoId,
            requestKeyHash: requestMeta.requestKeyHash,
            attempt: requestMeta.attempt,
            reason,
            droppedAtIso: new Date().toISOString(),
          });
          return true;
        }
        return false;
      };

      if (activeRequestRef.current && activeRequestRef.current.version !== requestVersion) {
        recordDroppedRequest({
          repoId: activeRequestRef.current.repoId,
          requestKeyHash: activeRequestRef.current.requestKeyHash,
          attempt: activeRequestRef.current.attempt,
          reason: "abort_unavailable",
          droppedAtIso: new Date().toISOString(),
        });
      }
      activeRequestRef.current = requestMeta;

      if (!isLoadMore) {
        setDashboardState("loading");
      }
      setLoadingMore(true);
      setError(null);
      setCanRetry(true);

      try {
        const data = await getDashboardStats(repoState.repo.repoId, timeRange, filesOffset, 20);
        if (isStaleRequest("superseded")) return;

        if (data.currentPeriod.period.commits === 0) {
          setEmptyReason("no-commits");
          setDashboardState("empty");
        } else if (data.currentPeriod.attribution.aiPercentage === 0) {
          setEmptyReason("no-ai");
          setDashboardState("empty");
        } else if (!data.topFiles.files.length) {
          setEmptyReason("no-attribution");
          setDashboardState("empty");
        } else {
          setEmptyReason(null);
          setDashboardState("default");
        }

        setStats(data);
        setLastUpdated(new Date());
        failureMetadataRef.current = null;
        activeRequestRef.current = null;
        setActionError(null);
      } catch (cause) {
        if (isStaleRequest("superseded")) return;
        const failure = classifyDashboardFailure(cause, captureReliabilityStatus);
        setDashboardState(failure.state);
        setError(failure.message);
        setCanRetry(failure.canRetry);
        setActionError(failure.message);
        failureMetadataRef.current = {
          repoId: requestMeta.repoId,
          requestKeyHash: requestMeta.requestKeyHash,
          failureClass: failure.failureClass,
          authorityOutcome: failure.authorityOutcome,
          attempt: requestMeta.attempt,
          failedAtIso: new Date().toISOString(),
          message: failure.message,
        };
        activeRequestRef.current = null;
      } finally {
        if (!isStaleRequest("superseded")) {
          setLoadingMore(false);
        }
      }
    },
    [captureReliabilityStatus, filesOffset, recordDroppedRequest, repoState, setActionError, timeRange],
  );

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeRepoId === null) {
      failureMetadataRef.current = null;
      return;
    }
    failureMetadataRef.current = null;
  }, [activeRepoId]);

  useEffect(() => {
    return () => {
      if (activeRequestRef.current) {
        recordDroppedRequest({
          repoId: activeRequestRef.current.repoId,
          requestKeyHash: activeRequestRef.current.requestKeyHash,
          attempt: activeRequestRef.current.attempt,
          reason: "mode_exit",
          droppedAtIso: new Date().toISOString(),
        });
      }
      activeRequestRef.current = null;
      failureMetadataRef.current = null;
    };
  }, [recordDroppedRequest]);

  const handleDrillDown = useCallback(
    (filter: DashboardFilter) => {
      const filterWithDate: DashboardFilter = {
        ...filter,
        dateRange: filter.dateRange || timeRangeToDateRange(timeRange),
      };
      onDrillDown(filterWithDate);
    },
    [onDrillDown, timeRange],
  );

  const handleTimeRangeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    setFilesOffset(0);
  }, []);

  const handleLoadMoreWithState = useCallback(() => {
    setFilesOffset((prev) => prev + 20);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        commandInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && document.activeElement === commandInputRef.current) {
        setCommandQuery("");
        commandInputRef.current?.blur();
        return;
      }

      if (isTypingTarget) return;

      const now = Date.now();
      const key = event.key.toLowerCase();
      const prev = sequenceRef.current;
      const withinChordWindow = now - prev.ts < DASHBOARD_CHORD_TIMEOUT_MS;

      if (key === "g") {
        sequenceRef.current = { lastKey: "g", ts: now };
        return;
      }

      if (withinChordWindow && prev.lastKey === "g" && key === "d") {
        onModeChange("dashboard");
        sequenceRef.current = { lastKey: "", ts: 0 };
        return;
      }

      if (withinChordWindow && prev.lastKey === "g" && key === "r") {
        onModeChange("repo");
        sequenceRef.current = { lastKey: "", ts: 0 };
        return;
      }

      if (key === "1") handleTimeRangeChange("7d");
      if (key === "2") handleTimeRangeChange("30d");
      if (key === "3") handleTimeRangeChange("90d");
      if (key === "4") handleTimeRangeChange("all");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleTimeRangeChange, onModeChange]);

  const visibleFiles = useMemo(() => {
    if (!stats) return [];
    const query = commandQuery.trim().toLowerCase();
    if (!query) return stats.topFiles.files;
    return stats.topFiles.files.filter((file) => file.filePath.toLowerCase().includes(query));
  }, [stats, commandQuery]);

  if (repoState.status !== "ready") {
    return <DashboardEmptyState reason="no-repo" />;
  }

  if (
    dashboardState === "error" ||
    dashboardState === "offline" ||
    dashboardState === "permission_denied"
  ) {
    return (
      <DashboardErrorState
        state={dashboardState}
        error={error ?? "Failed to load dashboard"}
        onRetry={() => void fetchStats()}
        onBackToRepo={() => onModeChange("repo")}
        canRetry={canRetry}
      />
    );
  }

  if (dashboardState === "loading") {
    return <DashboardLoadingState />;
  }

  if (dashboardState === "empty" && emptyReason) {
    return (
      <div className="dashboard-container animate-in fade-in slide-in-from-bottom-1 motion-page-enter">
        <DashboardHeader
          repoName={getRepoName(repoState.repo.root)}
          repoPath={repoState.repo.root}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          lastUpdated={lastUpdated}
          trustState={dashboardTrustState}
        />
        <DashboardEmptyState reason={emptyReason} />
      </div>
    );
  }

  if (!stats) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="dashboard-container h-full min-h-0 overflow-y-auto animate-in fade-in slide-in-from-bottom-1 motion-page-enter">
      <DashboardHeader
        repoName={stats.repo.name}
        repoPath={stats.repo.path}
        timeRange={stats.timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        lastUpdated={lastUpdated}
        trustState={dashboardTrustState}
      />

      <main className="bg-bg-tertiary px-6 py-6" data-dashboard-content>
        <section className="card mb-5 p-4" data-panel-status={panelStatusMap.metrics}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
              <span className="btn-tertiary-soft rounded-md px-2 py-1 font-medium text-text-secondary">
                / focus
              </span>
              <span className="btn-tertiary-soft rounded-md px-2 py-1 font-medium text-text-secondary">
                g then r repo
              </span>
              <span className="btn-tertiary-soft rounded-md px-2 py-1 font-medium text-text-secondary">
                1-4 range
              </span>
            </div>
            <input
              ref={commandInputRef}
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              placeholder="Quick filter files (e.g. src/ui)"
              className="w-full rounded-lg border border-border-light bg-bg-tertiary px-3 py-2 text-sm text-text-secondary outline-none ring-0 transition-colors placeholder:text-text-muted focus:border-accent-blue lg:max-w-xs"
              aria-label="Quick file filter"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => handleDrillDown({ type: "ai-only" })} className="btn-secondary-soft rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:duration-75 active:scale-95 hover:scale-105">
              AI only
            </button>
            <button type="button" onClick={() => handleDrillDown({ type: "tool", value: "codex" })} className="btn-secondary-soft rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:duration-75 active:scale-95 hover:scale-105">
              Codex
            </button>
            <button type="button" onClick={() => handleDrillDown({ type: "tool", value: "claude-code" })} className="btn-secondary-soft rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:duration-75 active:scale-95 hover:scale-105">
              Claude
            </button>
            {commandQuery && (
              <button type="button" onClick={() => setCommandQuery("")} className="btn-tertiary-soft rounded-md px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] active:duration-75 active:scale-95 hover:scale-105">
                Clear filter
              </button>
            )}
          </div>
        </section>

        <div data-panel-status={panelStatusMap.metrics}>
          <MetricsGrid
            currentPeriod={stats.currentPeriod}
            previousPeriod={stats.previousPeriod}
            toolBreakdown={stats.currentPeriod.toolBreakdown}
          />
        </div>

        <div data-panel-status={panelStatusMap.topFiles}>
          <TopFilesTable
            files={visibleFiles}
            hasMore={!commandQuery && stats.topFiles.hasMore}
            isLoading={loadingMore}
            onFileClick={handleDrillDown}
            onLoadMore={handleLoadMoreWithState}
          />
        </div>
      </main>
    </div>
  );
}
