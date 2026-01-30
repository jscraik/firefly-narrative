import { useCallback, useMemo } from 'react';
import { getCommitDiffForFile } from '../core/repo/git';
import { getOrLoadCommitFiles } from '../core/repo/indexer';
import { getTraceRangesForCommitFile } from '../core/repo/agentTrace';
import type { BranchViewModel, FileChange, TraceRange } from '../core/types';
import type { RepoState } from './useRepoLoader';

export interface UseCommitDataProps {
  mode: 'demo' | 'repo' | 'speculate';
  repoState: RepoState;
  diffCache: React.MutableRefObject<{ get(key: string): string | undefined; set(key: string, value: string): void }>;
  model: BranchViewModel | null;
}

export interface UseCommitDataReturn {
  model: BranchViewModel | null;
  repoPath: string | null;
  loadFilesForNode: (nodeId: string) => Promise<FileChange[]>;
  loadDiffForFile: (nodeId: string, filePath: string) => Promise<string>;
  loadTraceRangesForFile: (nodeId: string, filePath: string) => Promise<TraceRange[]>;
}

/**
 * Hook for loading commit-related data (files, diffs, traces).
 * Provides memoized model/path values and cached diff loading.
 */
export function useCommitData({
  mode,
  repoState,
  diffCache,
  model: _model
}: UseCommitDataProps): UseCommitDataReturn {
  const computedModel = useMemo(() => {
    if (mode === 'demo') {
      // Import demo model dynamically when in demo mode
      return require('../core/demo/nearbyGridDemo').NearbyGridDemo;
    }
    if (mode === 'repo' && repoState.status === 'ready') return repoState.model;
    return null;
  }, [mode, repoState]);

  const repoPath = useMemo(() => {
    if (repoState.status === 'ready') return repoState.repo.root;
    if (repoState.status === 'loading') return repoState.path;
    return null;
  }, [repoState]);

  const loadFilesForNode = useCallback(
    async (nodeId: string): Promise<FileChange[]> => {
      if (!computedModel) return [];

      if (computedModel.source === 'demo') {
        return computedModel.filesChanged ?? [];
      }

      if (repoState.status !== 'ready') return [];
      return await getOrLoadCommitFiles(repoState.repo, nodeId);
    },
    [computedModel, repoState]
  );

  const loadDiffForFile = useCallback(
    async (nodeId: string, filePath: string): Promise<string> => {
      if (!computedModel) return '';

      if (computedModel.source === 'demo') {
        return computedModel.diffsByFile?.[filePath] ?? '(no demo diff for this file)';
      }

      if (repoState.status !== 'ready') return '';

      const cacheKey = `${nodeId}:${filePath}`;
      const cached = diffCache.current.get(cacheKey);
      if (cached) return cached;

      const diff = await getCommitDiffForFile(repoState.repo.root, nodeId, filePath);
      diffCache.current.set(cacheKey, diff);
      return diff;
    },
    [computedModel, repoState, diffCache]
  );

  const loadTraceRangesForFile = useCallback(
    async (nodeId: string, filePath: string) => {
      if (!computedModel) return [];
      if (computedModel.source === 'demo') return [];
      if (repoState.status !== 'ready') return [];
      return await getTraceRangesForCommitFile(repoState.repo.repoId, nodeId, filePath);
    },
    [computedModel, repoState]
  );

  return {
    model: computedModel,
    repoPath,
    loadFilesForNode,
    loadDiffForFile,
    loadTraceRangesForFile
  };
}
