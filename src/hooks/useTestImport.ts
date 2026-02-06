import { useCallback } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { BranchViewModel } from '../core/types';
import { basename } from './basename';
import { readTextFile, writeNarrativeFile, ensureNarrativeDirs } from '../core/tauri/narrativeFs';
import { sha256Hex } from '../core/security/hash';
import { isoStampForFile } from './isoStampForFile';
import { parseJUnitXml } from '../core/repo/junit';
import { saveTestRun } from '../core/repo/testRuns';

export interface UseTestImportProps {
  repoRoot: string;
  repoId: number;
  setRepoState: (updater: (prev: BranchViewModel) => BranchViewModel) => void;
  setActionError: (error: string | null) => void;
}

export interface UseTestImportReturn {
  importJUnitForCommit: (commitSha: string) => Promise<void>;
}

function testBadgeForRun(run: { passed: number; failed: number }): { label: string; status: 'passed' | 'failed' } {
  if (run.failed > 0) return { label: `${run.failed} failed`, status: 'failed' };
  return { label: `${run.passed} passed`, status: 'passed' };
}

export function useTestImport({
  repoRoot,
  repoId,
  setRepoState,
  setActionError,
}: UseTestImportProps): UseTestImportReturn {
  const importJUnitForCommit = useCallback(
    async (commitSha: string) => {
      setActionError(null);

      try {
        const selected = await open({
          multiple: false,
          title: 'Import JUnit XML',
          filters: [{ name: 'JUnit XML', extensions: ['xml'] }],
        });

        if (!selected || Array.isArray(selected)) return;

        await ensureNarrativeDirs(repoRoot);

        const raw = await readTextFile(selected);
        const sha = await sha256Hex(raw);
        const parsed = parseJUnitXml(raw);

        const importedAtISO = new Date().toISOString();
        const sourceBasename = basename(selected);
        const rel = `tests/imported/${isoStampForFile()}_${sha.slice(0, 8)}_junit.xml`;

        // Strict provenance: if we cannot store the raw copy in `.narrative/`, fail import.
        await writeNarrativeFile(repoRoot, rel, raw);

        const saved = await saveTestRun({
          repoId,
          commitSha,
          format: 'junit',
          importedAtISO,
          sourceBasename,
          rawRelPath: rel,
          durationSec: parsed.durationSec,
          passed: parsed.passed,
          failed: parsed.failed,
          skipped: parsed.skipped,
          cases: parsed.cases,
        });

        const badge = testBadgeForRun(saved);

        // Update timeline badge + testRunId for immediate UI feedback.
        setRepoState((prev) => {
          const timeline = prev.timeline.map((n) => {
            if (n.id !== commitSha) return n;
            const existing = n.badges?.filter((b) => b.type !== 'test') ?? [];
            return {
              ...n,
              testRunId: saved.id,
              badges: [...existing, { type: 'test' as const, label: badge.label, status: badge.status }],
            };
          });
          return { ...prev, timeline };
        });
      } catch (e: unknown) {
        setActionError(e instanceof Error ? e.message : String(e));
      }
    },
    [repoRoot, repoId, setActionError, setRepoState]
  );

  return { importJUnitForCommit };
}
