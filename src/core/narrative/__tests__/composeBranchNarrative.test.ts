import { describe, expect, it } from 'vitest';
import type { BranchViewModel } from '../../types';
import {
  BRANCH_NARRATIVE_SCHEMA_VERSION,
  composeBranchNarrative,
} from '../composeBranchNarrative';

function baseModel(): BranchViewModel {
  return {
    source: 'git',
    title: 'feature/narrative',
    status: 'open',
    description: '/tmp/repo',
    stats: {
      added: 12,
      removed: 4,
      files: 3,
      commits: 1,
      prompts: 2,
      responses: 4,
    },
    intent: [],
    timeline: [],
  };
}

describe('composeBranchNarrative', () => {
  it('returns failed state when no commits are available', () => {
    const narrative = composeBranchNarrative(baseModel());

    expect(narrative.state).toBe('failed');
    expect(narrative.highlights).toHaveLength(0);
    expect(narrative.schemaVersion).toBe(BRANCH_NARRATIVE_SCHEMA_VERSION);
  });

  it('builds ready narrative with commit-backed highlights', () => {
    const model = baseModel();
    model.intent = [{ id: 'i1', text: 'Add progressive disclosure panel' }];
    model.timeline = [
      {
        id: 'abc1234',
        type: 'commit',
        label: 'feat: add narrative panel',
        badges: [{ type: 'trace', label: 'AI 68%' }],
      },
    ];

    const narrative = composeBranchNarrative(model);

    expect(narrative.state).toBe('ready');
    expect(narrative.summary).toContain('Primary intent');
    expect(narrative.highlights.length).toBeGreaterThan(0);
    expect(narrative.evidenceLinks.some((link) => link.kind === 'commit')).toBe(true);
  });
});
