import type {
  BranchNarrative,
  NarrativeDetailLevel,
  NarrativeEvidenceLink,
  StakeholderAudience,
  StakeholderProjections,
} from '../../core/types';

type BranchNarrativePanelProps = {
  narrative: BranchNarrative;
  projections: StakeholderProjections;
  audience: StakeholderAudience;
  detailLevel: NarrativeDetailLevel;
  killSwitchActive?: boolean;
  killSwitchReason?: string;
  onAudienceChange: (audience: StakeholderAudience) => void;
  onDetailLevelChange: (level: NarrativeDetailLevel) => void;
  onOpenEvidence: (link: NarrativeEvidenceLink) => void;
  onOpenRawDiff: () => void;
};

function DetailButton(props: {
  level: NarrativeDetailLevel;
  current: NarrativeDetailLevel;
  label: string;
  onClick: (level: NarrativeDetailLevel) => void;
}) {
  const { level, current, label, onClick } = props;
  const active = current === level;

  return (
    <button
      type="button"
      onClick={() => onClick(level)}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'border-accent-blue-light bg-accent-blue-bg text-accent-blue'
          : 'border-border-subtle bg-bg-primary text-text-secondary hover:border-border-light hover:bg-bg-secondary'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

export function BranchNarrativePanel(props: BranchNarrativePanelProps) {
  const {
    narrative,
    projections,
    audience,
    detailLevel,
    killSwitchActive = false,
    killSwitchReason,
    onAudienceChange,
    onDetailLevelChange,
    onOpenEvidence,
    onOpenRawDiff,
  } = props;
  const projection = projections[audience];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-header">NARRATIVE</div>
          <div className="section-subheader mt-0.5">
            confidence {(narrative.confidence * 100).toFixed(0)}% · state {narrative.state}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DetailButton level="summary" current={detailLevel} label="Summary" onClick={onDetailLevelChange} />
          <DetailButton level="evidence" current={detailLevel} label="Evidence" onClick={onDetailLevelChange} />
          <DetailButton level="diff" current={detailLevel} label="Raw Diff" onClick={onDetailLevelChange} />
        </div>
      </div>

      {killSwitchActive && (
        <div className="mt-3 rounded-lg border border-accent-red-light bg-accent-red-bg px-3 py-2 text-xs text-accent-red">
          Kill switch active. Narrative layers are read-only until quality recovers.{' '}
          <span className="text-text-secondary">{killSwitchReason ?? 'Fallback to raw diff is enforced.'}</span>
        </div>
      )}

      {detailLevel === 'summary' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-1">
            {(['executive', 'manager', 'engineer'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onAudienceChange(option)}
                className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${
                  audience === option
                    ? 'border-accent-green-light bg-accent-green-bg text-accent-green'
                    : 'border-border-subtle bg-bg-primary text-text-secondary hover:border-border-light hover:bg-bg-secondary'
                }`}
                aria-pressed={audience === option}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-primary p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{projection.audience}</div>
            <p className="mt-1 text-sm text-text-primary">{projection.headline}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-text-secondary">
              {projection.bullets.slice(0, 3).map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">{narrative.summary}</p>
          <ul className="space-y-2">
            {narrative.highlights.slice(0, 3).map((highlight) => (
              <li key={highlight.id} className="rounded-lg border border-border-subtle bg-bg-primary p-3">
                <div className="text-sm font-medium text-text-primary">{highlight.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-text-tertiary">{highlight.whyThisMatters}</p>
              </li>
            ))}
          </ul>
          {narrative.state === 'needs_attention' && narrative.fallbackReason && (
            <div className="rounded-lg border border-accent-amber-light bg-accent-amber-bg px-3 py-2 text-xs text-accent-amber">
              {narrative.fallbackReason}
            </div>
          )}
        </div>
      )}

      {detailLevel === 'evidence' && (
        <div className="mt-4 space-y-3">
          {narrative.evidenceLinks.length === 0 ? (
            <div className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-tertiary">
              No linked evidence yet. Use raw diff until more evidence is available.
            </div>
          ) : (
            narrative.evidenceLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => onOpenEvidence(link)}
                className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-border-light hover:bg-bg-secondary"
              >
                <span className="font-medium text-text-primary">{link.label}</span>
                <span className="ml-2 uppercase tracking-wide text-text-muted">{link.kind}</span>
              </button>
            ))
          )}
        </div>
      )}

      {detailLevel === 'diff' && (
        <div className="mt-4 rounded-lg border border-border-subtle bg-bg-primary p-4">
          <p className="text-sm text-text-secondary">
            Open raw diff to verify narrative claims directly against commit-level evidence.
          </p>
          <button
            type="button"
            onClick={onOpenRawDiff}
            className="mt-3 inline-flex rounded-md border border-border-light bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-primary"
          >
            Open raw diff context
          </button>
        </div>
      )}
    </div>
  );
}
