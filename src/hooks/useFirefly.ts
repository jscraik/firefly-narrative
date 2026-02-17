import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFireflySettings, setFireflyEnabled } from '../core/tauri/settings';
import type { TraceCommitSummary } from '../core/types';

export const FIREFLY_ANALYZING_DWELL_MS = 150;
export const FIREFLY_INSIGHT_DWELL_MS = 300;

export const FIREFLY_PRECEDENCE = ['insight', 'analyzing', 'tracking', 'idle'] as const;
export type FireflyStateType = (typeof FIREFLY_PRECEDENCE)[number];
export type FireflyLoader = 'files' | 'diff' | 'trace';

export const FIREFLY_TRANSITION_MATRIX: Record<FireflyStateType, readonly FireflyStateType[]> = {
  idle: ['tracking', 'analyzing'],
  tracking: ['analyzing', 'idle'],
  analyzing: ['insight', 'tracking', 'idle', 'analyzing'],
  insight: ['analyzing', 'tracking', 'idle', 'insight'],
};

export type FireflyEvent =
  | { type: 'idle'; selectedNodeId: string | null }
  | { type: 'tracking'; selectedNodeId: string }
  | { type: 'analyzing'; selectedNodeId: string; pendingLoaders: FireflyLoader[]; pendingKey: string }
  | { type: 'insight'; selectedNodeId: string; selectedCommitSha: string; insightKey: string };

export interface UseFireflyOptions {
  selectedNodeId: string | null;
  selectedCommitSha: string | null;
  hasSelectedFile: boolean;
  trackingSettled: boolean;
  loadingFiles: boolean;
  loadingDiff: boolean;
  loadingTrace: boolean;
  traceRequestedForSelection: boolean;
  traceSummary?: TraceCommitSummary;
  onPersistenceError?: (message: string) => void;
}

export interface UseFireflyReturn {
  /** Whether firefly is enabled (from persisted settings) */
  enabled: boolean;
  /** Loading state while fetching settings */
  loading: boolean;
  /** Toggle firefly enabled state */
  toggle: (nextEnabled?: boolean) => Promise<void>;
  /** Current semantic firefly event/state */
  event: FireflyEvent;
}

function buildInsightKey(
  selectedCommitSha: string | null,
  summary: TraceCommitSummary | undefined,
): string | null {
  if (!selectedCommitSha || !summary) return null;
  if (summary.commitSha !== selectedCommitSha) return null;

  const totalLines = summary.aiLines + summary.humanLines + summary.mixedLines + summary.unknownLines;
  if (totalLines <= 0) return null;

  const sortedModelIds = [...summary.modelIds].sort().join(',');
  const sortedToolNames = [...summary.toolNames].sort().join(',');

  return [
    selectedCommitSha,
    summary.commitSha,
    summary.aiLines,
    summary.humanLines,
    summary.mixedLines,
    summary.unknownLines,
    sortedModelIds,
    sortedToolNames,
  ].join(':');
}

function getPendingApplicableLoaders(options: UseFireflyOptions): FireflyLoader[] {
  if (!options.selectedCommitSha) return [];

  const pending: FireflyLoader[] = [];

  // files loader applies for commit selections only
  if (options.loadingFiles) {
    pending.push('files');
  }

  // diff loader applies for commit + selected file
  if (options.hasSelectedFile && options.loadingDiff) {
    pending.push('diff');
  }

  // trace loader applies for commit + selected file + explicit trace request flag
  if (options.hasSelectedFile && options.traceRequestedForSelection && options.loadingTrace) {
    pending.push('trace');
  }

  return pending;
}

function resolveTargetType(
  currentType: FireflyStateType,
  signals: Record<FireflyStateType, boolean>,
): FireflyStateType {
  const allowedTargets = FIREFLY_TRANSITION_MATRIX[currentType];

  for (const state of FIREFLY_PRECEDENCE) {
    if (!signals[state]) continue;
    if (state === currentType) return state;
    if (allowedTargets.includes(state)) return state;
  }

  return currentType;
}

function sameEvent(a: FireflyEvent, b: FireflyEvent): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case 'idle':
      return a.selectedNodeId === (b as Extract<FireflyEvent, { type: 'idle' }>).selectedNodeId;
    case 'tracking':
      return a.selectedNodeId === (b as Extract<FireflyEvent, { type: 'tracking' }>).selectedNodeId;
    case 'analyzing': {
      const next = b as Extract<FireflyEvent, { type: 'analyzing' }>;
      return a.selectedNodeId === next.selectedNodeId && a.pendingKey === next.pendingKey;
    }
    case 'insight': {
      const next = b as Extract<FireflyEvent, { type: 'insight' }>;
      return (
        a.selectedNodeId === next.selectedNodeId
        && a.selectedCommitSha === next.selectedCommitSha
        && a.insightKey === next.insightKey
      );
    }
    default:
      return false;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Hook to manage Firefly signal state and settings.
 *
 * Ownership boundary:
 * - BranchView provides normalized inputs and lifecycle signals.
 * - useFirefly is the single owner of semantic-state transitions.
 * - Timeline remains rendering/positioning only.
 */
export function useFirefly(options: UseFireflyOptions): UseFireflyReturn {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<FireflyEvent>({ type: 'idle', selectedNodeId: null });
  const [dwellTick, setDwellTick] = useState(0);

  const eventRef = useRef(event);
  const enabledRef = useRef(enabled);
  const dwellTimerRef = useRef<number | null>(null);
  const stateEnteredAtRef = useRef(Date.now());
  const selectionSeqRef = useRef(0);
  const lastSelectionRef = useRef<string | null>(options.selectedNodeId);
  const lastInsightKeyByCommitRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (lastSelectionRef.current === options.selectedNodeId) return;
    selectionSeqRef.current += 1;
    lastSelectionRef.current = options.selectedNodeId;
  }, [options.selectedNodeId]);

  // Load persisted settings on mount.
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      // In browser dev mode, skip backend call
      if (import.meta.env.DEV) {
        setLoading(false);
        return;
      }

      try {
        const settings = await getFireflySettings();
        if (!cancelled) {
          setEnabled(settings.enabled);
        }
      } catch (error) {
        console.error('[firefly.settings.load_failed]', error);
        if (!cancelled) {
          options.onPersistenceError?.(`Unable to load Firefly settings: ${getErrorMessage(error)}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [options.onPersistenceError]);

  const insightKey = useMemo(
    () => buildInsightKey(options.selectedCommitSha, options.traceSummary),
    [options.selectedCommitSha, options.traceSummary],
  );

  const pendingLoaders = useMemo(() => getPendingApplicableLoaders(options), [options]);
  const pendingKey = pendingLoaders.join('|');

  const trackingSignal = Boolean(options.selectedNodeId) && !options.trackingSettled;
  const analyzingSignal = pendingLoaders.length > 0;

  const toggle = useCallback(async (nextEnabled?: boolean) => {
    const currentEnabled = enabledRef.current;
    const targetEnabled = typeof nextEnabled === 'boolean' ? nextEnabled : !currentEnabled;

    setEnabled(targetEnabled);
    enabledRef.current = targetEnabled;

    if (!targetEnabled) {
      setEvent({ type: 'idle', selectedNodeId: null });
      stateEnteredAtRef.current = Date.now();
    }

    try {
      if (!import.meta.env.DEV) {
        await setFireflyEnabled(targetEnabled);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('[firefly.toggle.persist_failed]', error);

      setEnabled(currentEnabled);
      enabledRef.current = currentEnabled;
      options.onPersistenceError?.(`Unable to persist Firefly setting: ${message}`);
    }
  }, [options]);

  useEffect(() => {
    // Intentionally referenced so manual dwell retries can retrigger this effect.
    void dwellTick;

    if (dwellTimerRef.current !== null) {
      window.clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }

    if (!enabled) {
      if (eventRef.current.type !== 'idle' || eventRef.current.selectedNodeId !== null) {
        setEvent({ type: 'idle', selectedNodeId: null });
        stateEnteredAtRef.current = Date.now();
      }
      return;
    }

    const currentEvent = eventRef.current;
    const now = Date.now();
    const selectionChanged = currentEvent.selectedNodeId !== options.selectedNodeId;

    const insightSignal = Boolean(
      options.selectedCommitSha
      && insightKey
      && lastInsightKeyByCommitRef.current.get(options.selectedCommitSha) !== insightKey,
    );

    const targetType = resolveTargetType(currentEvent.type, {
      insight: insightSignal,
      analyzing: analyzingSignal,
      tracking: trackingSignal,
      idle: true,
    });

    const nextEvent = (() => {
      switch (targetType) {
        case 'tracking':
          return options.selectedNodeId
            ? ({ type: 'tracking', selectedNodeId: options.selectedNodeId } satisfies FireflyEvent)
            : ({ type: 'idle', selectedNodeId: null } satisfies FireflyEvent);
        case 'analyzing':
          return options.selectedNodeId
            ? ({
              type: 'analyzing',
              selectedNodeId: options.selectedNodeId,
              pendingLoaders,
              pendingKey,
            } satisfies FireflyEvent)
            : ({ type: 'idle', selectedNodeId: null } satisfies FireflyEvent);
        case 'insight':
          return options.selectedNodeId && options.selectedCommitSha && insightKey
            ? ({
              type: 'insight',
              selectedNodeId: options.selectedNodeId,
              selectedCommitSha: options.selectedCommitSha,
              insightKey,
            } satisfies FireflyEvent)
            : ({ type: 'idle', selectedNodeId: null } satisfies FireflyEvent);
        default:
          return { type: 'idle', selectedNodeId: options.selectedNodeId } satisfies FireflyEvent;
      }
    })();

    let dwellRemaining = 0;

    if (!selectionChanged) {
      if (currentEvent.type === 'analyzing' && nextEvent.type !== 'analyzing' && nextEvent.type !== 'insight') {
        dwellRemaining = Math.max(0, FIREFLY_ANALYZING_DWELL_MS - (now - stateEnteredAtRef.current));
      }

      if (currentEvent.type === 'insight' && nextEvent.type !== 'insight') {
        const analyzingRestart = nextEvent.type === 'analyzing' && currentEvent.selectedNodeId === options.selectedNodeId;

        if (!analyzingRestart) {
          dwellRemaining = Math.max(dwellRemaining, FIREFLY_INSIGHT_DWELL_MS - (now - stateEnteredAtRef.current));
        }
      }
    }

    if (dwellRemaining > 0) {
      const localSelectionSeq = selectionSeqRef.current;
      dwellTimerRef.current = window.setTimeout(() => {
        if (!enabledRef.current) return;
        if (selectionSeqRef.current !== localSelectionSeq) return;
        setDwellTick((tick) => tick + 1);
      }, dwellRemaining);
      return;
    }

    if (sameEvent(currentEvent, nextEvent)) {
      return;
    }

    const typeChanged = currentEvent.type !== nextEvent.type;
    const shouldRefreshDwellWindow = typeChanged
      || (currentEvent.type === 'insight' && nextEvent.type === 'insight' && currentEvent.insightKey !== nextEvent.insightKey);

    if (nextEvent.type === 'insight') {
      lastInsightKeyByCommitRef.current.set(nextEvent.selectedCommitSha, nextEvent.insightKey);
    }

    if (shouldRefreshDwellWindow) {
      stateEnteredAtRef.current = now;
    }

    setEvent(nextEvent);
  }, [
    analyzingSignal,
    dwellTick,
    enabled,
    insightKey,
    options.selectedCommitSha,
    options.selectedNodeId,
    pendingKey,
    pendingLoaders,
    trackingSignal,
  ]);

  useEffect(() => {
    return () => {
      if (dwellTimerRef.current !== null) {
        window.clearTimeout(dwellTimerRef.current);
      }
    };
  }, []);

  return {
    enabled,
    loading,
    toggle,
    event,
  };
}
