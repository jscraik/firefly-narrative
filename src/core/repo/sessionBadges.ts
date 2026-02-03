import { loadSessionExcerpts } from './sessions';
import { getSessionLinksForCommit } from './sessionLinking';
import type { BranchViewModel } from '../types';

export async function refreshSessionBadges(
  repoRoot: string,
  repoId: number,
  timeline: Array<{ id: string }>,
  setRepoState: (updater: (prev: BranchViewModel) => BranchViewModel) => void,
  options?: { unlinkMode?: boolean; limit?: number }
) {
  const limit = options?.limit ?? 10;
  const unlinkMode = options?.unlinkMode ?? false;

  const sessionExcerpts = await loadSessionExcerpts(repoRoot, repoId, limit);

  const commitShas = timeline.map((n) => n.id);
  const linksByCommit: Record<string, import('./sessionLinking').SessionLink[]> = {};
  for (const sha of commitShas) {
    const links = await getSessionLinksForCommit(repoId, sha);
    if (links.length > 0) {
      linksByCommit[sha] = links;
    }
  }

  setRepoState((prev) => {
    const existingBadges = prev.timeline.map((node) => {
      const links = linksByCommit[node.id];
      if (!links || links.length === 0) {
        if (unlinkMode) {
          return {
            ...node,
            badges: node.badges?.filter((b) => b.type !== 'session') ?? [],
          };
        }
        return node;
      }
      const existing = node.badges?.filter((b) => b.type !== 'session') ?? [];
      return {
        ...node,
        badges: [
          ...existing,
          { type: 'session' as const, label: `${links.length} session${links.length > 1 ? 's' : ''}` },
        ],
      };
    });

    return {
      ...prev,
      sessionExcerpts,
      timeline: existingBadges,
    };
  });
}
