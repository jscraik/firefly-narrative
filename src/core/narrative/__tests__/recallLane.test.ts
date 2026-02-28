import { describe, expect, it } from 'vitest';
import { sanitizeConfidence, buildRecallLane, compareRecallLaneItems } from '../recallLane';
import type { BranchNarrative } from '../../types';

describe('sanitizeConfidence', () => {
  it('normalizes malformed confidence values', () => {
    expect(sanitizeConfidence(-1)).toBe(0);
    expect(sanitizeConfidence(2)).toBe(1);
    expect(sanitizeConfidence(NaN)).toBe(0);
  });
});

describe('compareRecallLaneItems', () => {
  it('produces deterministic ordering for equal confidence and tier using sourceIndex then id', () => {
    const itemA: Parameters<typeof compareRecallLaneItems>[0] = {
      item: {
        id: 'b-id',
        title: 'A',
        whyThisMatters: 'A',
        confidence: 0.8,
        confidenceTier: 'high',
        evidenceLinks: [],
        source: 'highlight' as const,
      },
      sourceIndex: 1,
    };
    const itemB: Parameters<typeof compareRecallLaneItems>[0] = {
      item: {
        id: 'a-id',
        title: 'B',
        whyThisMatters: 'B',
        confidence: 0.8,
        confidenceTier: 'high',
        evidenceLinks: [],
        source: 'highlight' as const,
      },
      sourceIndex: 0,
    };

    expect(compareRecallLaneItems(itemA, itemB)).toBeGreaterThan(0);
  });
});

describe('buildRecallLane', () => {
  const narrative: BranchNarrative = {
    schemaVersion: 1,
    generatedAtISO: '2026-02-27T00:00:00.000Z',
    state: 'ready',
    summary: 'A short summary of branch intent.',
    confidence: 0.64,
    highlights: [
      {
        id: 'highlight:aaa',
        title: 'Zigzag commit',
        whyThisMatters: 'Most recent commit has mixed signals.',
        confidence: 0.5,
        evidenceLinks: [
          {
            id: 'commit:aaa',
            kind: 'commit',
            label: 'Commit aaa',
            commitSha: 'aaa',
          },
        ],
      },
      {
        id: 'highlight:bbb',
        title: 'Anchor commit',
        whyThisMatters: 'Highest confidence signal.',
        confidence: 0.88,
        evidenceLinks: [],
      },
      {
        id: 'highlight:ccc',
        title: 'Session-sourced commit',
        whyThisMatters: 'Confidence with missing evidence.',
        confidence: 0.5,
        evidenceLinks: [],
      },
    ],
    evidenceLinks: [
      {
        id: 'commit:aaa',
        kind: 'commit',
        label: 'Commit aaa',
        commitSha: 'aaa',
      },
    ],
  };

  it('builds ordered lane items from highlights', () => {
    const lane = buildRecallLane(narrative, { maxItems: 3, confidenceFloor: 0.25 });

    expect(lane).toHaveLength(3);
    expect(lane[0]).toMatchObject({
      id: 'highlight:bbb',
      confidenceTier: 'high',
    });
    expect(lane[1]?.id).toBe('highlight:aaa');
    expect(lane[2]?.id).toBe('highlight:ccc');
    expect(lane.every((item) => Number.isFinite(item.confidence))).toBe(true);
  });

  it('returns deterministic order across repeated calls with malformed confidence', () => {
    const mutatedHighlights = narrative.highlights.map((highlight, index) => {
      const overrides = [NaN, 2, -5][index] as unknown as number;
      return {
        ...highlight,
        confidence: index < 3 ? overrides : highlight.confidence,
      };
    });

    const mutated = {
      ...narrative,
      highlights: mutatedHighlights,
    } as BranchNarrative;

    const first = buildRecallLane(mutated, { maxItems: 3, confidenceFloor: 0 });
    const second = buildRecallLane(mutated, { maxItems: 3, confidenceFloor: 0 });
    expect(first).toEqual(second);
    expect(first.map((item) => item.id)).toEqual(['highlight:bbb', 'highlight:aaa', 'highlight:ccc']);
  });

  it('falls back to summary-derived item when highlights are missing', () => {
    const lane = buildRecallLane(
      {
        ...narrative,
        highlights: [],
      },
      {
        maxItems: 1,
      }
    );

    expect(lane).toHaveLength(1);
    expect(lane[0]).toMatchObject({
      source: 'fallback',
      title: 'Review branch summary',
    });
    expect(lane[0]?.evidenceLinks).toHaveLength(1);
  });
});
