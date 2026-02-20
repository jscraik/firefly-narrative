import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BranchViewModel } from '../core/types';
import { refreshSessionBadges } from '../core/repo/sessionBadges';
import { setOtelReceiverEnabled } from '../core/tauri/otelReceiver';
import { getIngestActivity, type ActivityEvent } from '../core/tauri/activity';
import {
  autoImportSessionFile,
  configureCodexOtel,
  codexAppServerInitialize,
  codexAppServerSetStreamHealth,
  discoverCaptureSources,
  getCaptureReliabilityStatus,
  getCollectorMigrationStatus,
  getCodexAppServerStatus,
  getIngestConfig,
  ensureOtlpApiKey,
  getOtlpKeyStatus,
  backfillRecentSessions,
  purgeExpiredSessions,
  resetOtlpApiKey,
  rollbackCollectorMigration,
  runCollectorMigration,
  setIngestConfig,
  startCodexAppServer,
  stopCodexAppServer,
  startFileWatcher,
  stopFileWatcher,
  type CaptureReliabilityStatus,
  type CodexAppServerStatus,
  type CollectorMigrationStatus,
  type IngestConfig,
  type DiscoveredSources,
  type OtlpKeyStatus
} from '../core/tauri/ingestConfig';

export type IngestStatus = {
  enabled: boolean;
  captureMode: 'OTEL_ONLY' | 'HYBRID_ACTIVE' | 'DEGRADED_STREAMING' | 'FAILURE';
  captureModeMessage?: string;
  migrationRequired: boolean;
  lastImportAt?: string;
  lastSource?: string;
  errorCount: number;
};

export type IngestIssue = {
  id: string;
  title: string;
  message: string;
  action?: { label: string; handler: () => void };
};

export type IngestToast = {
  id: string;
  message: string;
};

export function useAutoIngest(params: {
  repoRoot: string;
  repoId: number;
  model: BranchViewModel;
  setRepoState: (updater: (prev: BranchViewModel) => BranchViewModel) => void;
}) {
  const { repoRoot, repoId, model, setRepoState } = params;
  const [config, setConfig] = useState<IngestConfig | null>(null);
  const [otlpKey, setOtlpKey] = useState<OtlpKeyStatus | null>(null);
  const [sources, setSources] = useState<DiscoveredSources | null>(null);
  const [status, setStatus] = useState<IngestStatus>({
    enabled: false,
    captureMode: 'FAILURE',
    migrationRequired: false,
    errorCount: 0
  });
  const [collectorMigration, setCollectorMigration] = useState<CollectorMigrationStatus | null>(null);
  const [captureReliability, setCaptureReliability] = useState<CaptureReliabilityStatus | null>(null);
  const [codexAppServerStatus, setCodexAppServerStatus] = useState<CodexAppServerStatus | null>(null);
  const [issues, setIssues] = useState<IngestIssue[]>([]);
  const [toast, setToast] = useState<IngestToast | null>(null);
  const [activityRecent, setActivityRecent] = useState<ActivityEvent[]>([]);
  const lastImportRef = useRef<{ source?: string; time?: string }>({});
  const idCounter = useRef(0);
  const reliabilityRefreshInFlightRef = useRef(false);

  const refreshActivity = useCallback(async (limit: number) => {
    try {
      const items = await getIngestActivity(repoId, limit);
      setActivityRecent(items.slice(0, 3));
      const lastSeenAtISO = items[0]?.createdAtIso;
      if (lastSeenAtISO) {
        lastImportRef.current = { ...lastImportRef.current, time: lastSeenAtISO };
        setStatus((prev) => ({
          ...prev,
          lastImportAt: lastSeenAtISO
        }));
      }
    } catch (e) {
      // non-fatal; avoid spamming issues list for optional UI enhancement
      void e;
    }
  }, [repoId]);

  const watchPaths = useMemo(() => {
    if (!config) return [];
    const base = [...config.watchPaths.claude, ...config.watchPaths.cursor];
    if (config.codex.mode === 'logs' || config.codex.mode === 'both') {
      base.push(...(config.watchPaths.codexLogs ?? []));
    }
    return base;
  }, [config]);

  const refreshBadges = useCallback(async () => {
    if (!repoRoot || !repoId) return;
    await refreshSessionBadges(repoRoot, repoId, model.timeline, setRepoState, { limit: 10 });
  }, [repoRoot, repoId, model.timeline, setRepoState]);

  const recordIssue = useCallback((title: string, message: string, action?: IngestIssue['action']) => {
    idCounter.current += 1;
    const id = `${Date.now()}-${idCounter.current}`;
    setIssues((prev) => {
      if (prev.some((issue) => issue.title === title && issue.message === message)) {
        return prev;
      }
      setStatus((prevStatus) => ({ ...prevStatus, errorCount: prevStatus.errorCount + 1 }));
      return [{ id, title, message, action }, ...prev];
    });
  }, []);

  const refreshReliability = useCallback(async () => {
    if (reliabilityRefreshInFlightRef.current) return;
    reliabilityRefreshInFlightRef.current = true;
    try {
      const [migration, reliability, appServer] = await Promise.all([
        getCollectorMigrationStatus(),
        getCaptureReliabilityStatus(),
        getCodexAppServerStatus(),
      ]);

      setCollectorMigration(migration);
      setCaptureReliability(reliability);
      setCodexAppServerStatus(appServer);
      setStatus((prev) => ({
        ...prev,
        captureMode: reliability.mode,
        captureModeMessage: reliability.reasons[0],
        migrationRequired: migration.migrationRequired,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      recordIssue('Capture reliability check failed', message);
    } finally {
      reliabilityRefreshInFlightRef.current = false;
    }
  }, [recordIssue]);

  const showToast = useCallback((message: string) => {
    idCounter.current += 1;
    const id = `${Date.now()}-${idCounter.current}`;
    setToast({ id, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3500);
  }, []);

  const handleAutoImport = useCallback(
    async (payload: { path: string; tool?: string }) => {
      if (!repoId) return;
      try {
        const result = await autoImportSessionFile(repoId, payload.path);
        await refreshBadges();
        await refreshActivity(3);

        if (result.status === 'imported') {
          const message = `Imported ${result.tool} session (redactions: ${result.redactionCount})`;
          showToast(message);
          lastImportRef.current = { source: result.tool, time: new Date().toISOString() };
          setStatus((prev) => ({
            ...prev,
            lastImportAt: lastImportRef.current.time,
            lastSource: result.tool
          }));
        } else if (result.status === 'skipped') {
          showToast(`Skipped duplicate ${result.tool} session`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        recordIssue('Auto-import failed', message);
      }
    },
    [repoId, refreshBadges, refreshActivity, recordIssue, showToast]
  );

  useEffect(() => {
    if (!repoRoot || !repoId) return;
    let mounted = true;

    const load = async () => {
      try {
        const config = await getIngestConfig();
        const key = await getOtlpKeyStatus();
        const discovered = await discoverCaptureSources();
        const migration = await getCollectorMigrationStatus();
        const reliability = await getCaptureReliabilityStatus();
        const appServer = await getCodexAppServerStatus();
        if (!mounted) return;
        setConfig(config);
        setOtlpKey(key);
        setSources(discovered);
        setCollectorMigration(migration);
        setCaptureReliability(reliability);
        setCodexAppServerStatus(appServer);
        setStatus((prev) => ({ ...prev, enabled: config.autoIngestEnabled }));
        setStatus((prev) => ({
          ...prev,
          enabled: config.autoIngestEnabled,
          captureMode: reliability.mode,
          captureModeMessage: reliability.reasons[0],
          migrationRequired: migration.migrationRequired,
        }));
        await purgeExpiredSessions(repoId, config.retentionDays);
        await refreshActivity(3);
      } catch (e) {
        if (!mounted) return;
        recordIssue('Ingest config error', e instanceof Error ? e.message : String(e));
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [repoRoot, repoId, recordIssue, refreshActivity]);

  useEffect(() => {
    if (!repoRoot || !repoId) return;
    if (!config?.autoIngestEnabled) return;
    let cancelled = false;
    let unlistenStatus: (() => void) | undefined;

    const attach = async () => {
      try {
        unlistenStatus = await listen<CodexAppServerStatus>('codex-app-server-status', (event) => {
          if (cancelled) return;
          setCodexAppServerStatus(event.payload);
        });
      } catch {
        // optional listener
      }
    };

    attach();
    const interval = setInterval(() => {
      if (cancelled) return;
      void refreshReliability();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (unlistenStatus) unlistenStatus();
    };
  }, [repoRoot, repoId, config?.autoIngestEnabled, refreshReliability]);

  useEffect(() => {
    if (!config?.autoIngestEnabled || watchPaths.length === 0) return;
    if (!repoRoot || !repoId) return;

    let unlisten: (() => void) | undefined;
    let unlistenOtel: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      try {
        await startFileWatcher(watchPaths);
      } catch (e) {
        recordIssue('Auto-ingest disabled', e instanceof Error ? e.message : String(e));
        return;
      }

      try {
        unlisten = await listen<{ path: string; tool?: string }>('session-file-changed', async (event) => {
          if (cancelled) return;
          await handleAutoImport(event.payload);
        });
      } catch (e) {
        recordIssue('Auto-ingest listener failed', e instanceof Error ? e.message : String(e));
      }

      try {
        unlistenOtel = await listen('otel-trace-ingested', async () => {
          if (cancelled) return;
          await refreshActivity(3);
        });
      } catch {
        // optional
      }
    };

    start();

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      if (unlistenOtel) unlistenOtel();
      stopFileWatcher();
    };
  }, [config?.autoIngestEnabled, watchPaths, repoRoot, repoId, handleAutoImport, refreshActivity, recordIssue]);

  const toggleAutoIngest = useCallback(
    async (enabled: boolean) => {
      try {
        const codexUpdate = !enabled && config
          ? { ...config.codex, receiverEnabled: false }
          : undefined;
        const next = await setIngestConfig({
          autoIngestEnabled: enabled,
          codex: codexUpdate
        });
        setConfig(next);
        setStatus((prev) => ({ ...prev, enabled }));

        if (!enabled) {
          stopFileWatcher();
          try {
            await setOtelReceiverEnabled(false);
            await stopCodexAppServer();
          } catch (e) {
            recordIssue('Failed to disable Codex receiver', e instanceof Error ? e.message : String(e));
          }
          await refreshReliability();
          return;
        }

        // Backfill immediately so the UI doesn’t feel empty.
        showToast('Backfilling recent sessions…');
        try {
          const res = await backfillRecentSessions(repoId, 10);
          if (res.failed && res.failed > 0) {
            showToast(`Backfilled ${res.imported} session(s) with ${res.failed} failure(s).`);
          } else if (res.imported && res.imported > 0) {
            showToast(`Backfilled ${res.imported} session(s).`);
          } else {
            showToast('No sessions found to backfill.');
          }
          await refreshBadges();
          await refreshActivity(3);
        } catch (e) {
          // Backfill failure should not prevent enabling capture.
          const msg = e instanceof Error ? e.message : String(e);
          recordIssue('Backfill failed', msg);
        }

        if (next.consent.codexTelemetryGranted && next.codex.receiverEnabled) {
          if (otlpKey?.present) {
            try {
              await setOtelReceiverEnabled(true);
            } catch (e) {
              recordIssue('Failed to enable Codex receiver', e instanceof Error ? e.message : String(e));
            }
          } else {
            recordIssue(
              'Missing Codex API key',
              'Generate an API key in Narrative settings (stored securely), then configure Codex telemetry.'
            );
          }
        }

        if (next.codex.streamEnrichmentEnabled && !next.codex.streamKillSwitch) {
          try {
            await startCodexAppServer();
            await codexAppServerInitialize();
            await codexAppServerSetStreamHealth(true);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            recordIssue('Codex App Server degraded', msg);
          }
        }
        await refreshReliability();
      } catch (e) {
        recordIssue('Auto-ingest toggle failed', e instanceof Error ? e.message : String(e));
      }
    },
    [config, otlpKey?.present, repoId, refreshActivity, refreshBadges, recordIssue, refreshReliability, showToast]
  );

  const updateWatchPaths = useCallback(async (paths: { claude: string[]; cursor: string[]; codexLogs: string[] }) => {
    try {
      const next = await setIngestConfig({ watchPaths: paths });
      setConfig(next);
      await refreshReliability();
    } catch (e) {
      recordIssue('Failed to update watch paths', e instanceof Error ? e.message : String(e));
    }
  }, [recordIssue, refreshReliability]);

  const configureCodexTelemetry = useCallback(async () => {
    if (!config) return;
    try {
      const key = await ensureOtlpApiKey();
      setOtlpKey(key);
      await configureCodexOtel(config.codex.endpoint);
      const receiverEnabled = key.present && config.consent.codexTelemetryGranted;
      const next = await setIngestConfig({
        codex: { ...config.codex, receiverEnabled }
      });
      setConfig(next);
      showToast('Codex telemetry configured');
      await refreshReliability();
    } catch (e) {
      recordIssue('Codex config failed', e instanceof Error ? e.message : String(e));
    }
  }, [config, recordIssue, refreshReliability, showToast]);

  const rotateOtlpKey = useCallback(async () => {
    try {
      const key = await resetOtlpApiKey();
      setOtlpKey(key);
      showToast('Receiver API key rotated');
    } catch (e) {
      recordIssue('Key rotation failed', e instanceof Error ? e.message : String(e));
    }
  }, [recordIssue, showToast]);

  const grantCodexConsent = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      const next = await setIngestConfig({
        consent: { codexTelemetryGranted: true, grantedAtIso: now }
      });
      setConfig(next);
    } catch (e) {
      recordIssue('Consent update failed', e instanceof Error ? e.message : String(e));
    }
  }, [recordIssue]);

  const migrateCollector = useCallback(async (dryRun = false) => {
    try {
      const result = await runCollectorMigration(dryRun);
      setCollectorMigration(result.status);
      if (!dryRun && result.migrated) {
        showToast('Collector migration completed');
      } else if (dryRun) {
        showToast('Collector migration dry-run ready');
      }
      await refreshReliability();
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      recordIssue('Collector migration failed', message);
      throw e;
    }
  }, [recordIssue, refreshReliability, showToast]);

  const rollbackCollector = useCallback(async () => {
    try {
      const result = await rollbackCollectorMigration();
      setCollectorMigration(result.status);
      showToast('Collector migration rollback applied');
      await refreshReliability();
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      recordIssue('Collector rollback failed', message);
      throw e;
    }
  }, [recordIssue, refreshReliability, showToast]);

  const dismissIssue = useCallback((id: string) => {
    setIssues((prev) => prev.filter((issue) => issue.id !== id));
  }, []);

  return {
    ingestConfig: config,
    otlpEnvStatus: null,
    otlpKeyStatus: otlpKey,
    discoveredSources: sources,
    collectorMigrationStatus: collectorMigration,
    captureReliabilityStatus: captureReliability,
    codexAppServerStatus,
    ingestStatus: status,
    activityRecent,
    getActivityAll: async () => getIngestActivity(repoId, 50),
    issues,
    toast,
    toggleAutoIngest,
    updateWatchPaths,
    configureCodexTelemetry,
    rotateOtlpKey,
    grantCodexConsent,
    migrateCollector,
    rollbackCollector,
    refreshCaptureReliability: refreshReliability,
    dismissIssue
  };
}
