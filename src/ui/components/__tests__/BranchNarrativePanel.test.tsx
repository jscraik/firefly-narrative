import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BranchNarrative } from '../../../core/types';
import { BranchNarrativePanel } from '../BranchNarrativePanel';

const narrative: BranchNarrative = {
  schemaVersion: 1,
  generatedAtISO: '2026-02-18T00:00:00.000Z',
  state: 'ready',
  summary: 'Summary text',
  confidence: 0.72,
  highlights: [
    {
      id: 'h1',
      title: 'Highlight',
      whyThisMatters: 'Reason',
      confidence: 0.7,
      evidenceLinks: [
        {
          id: 'commit:abc123',
          kind: 'commit',
          label: 'Commit abc123',
          commitSha: 'abc123',
        },
      ],
    },
  ],
  evidenceLinks: [
    {
      id: 'commit:abc123',
      kind: 'commit',
      label: 'Commit abc123',
      commitSha: 'abc123',
    },
  ],
};

describe('BranchNarrativePanel', () => {
  it('renders summary view and allows switching detail levels', () => {
    const onDetailLevelChange = vi.fn();
    render(
      <BranchNarrativePanel
        narrative={narrative}
        detailLevel="summary"
        onDetailLevelChange={onDetailLevelChange}
        onOpenEvidence={vi.fn()}
        onOpenRawDiff={vi.fn()}
      />
    );

    expect(screen.getByText('Summary text')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Evidence' }));
    expect(onDetailLevelChange).toHaveBeenCalledWith('evidence');
  });

  it('calls evidence callback in evidence view', () => {
    const onOpenEvidence = vi.fn();
    render(
      <BranchNarrativePanel
        narrative={narrative}
        detailLevel="evidence"
        onDetailLevelChange={vi.fn()}
        onOpenEvidence={onOpenEvidence}
        onOpenRawDiff={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Commit abc123/i }));
    expect(onOpenEvidence).toHaveBeenCalledTimes(1);
  });
});
