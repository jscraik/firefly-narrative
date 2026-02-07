import { AiContributionBadge } from './AiContributionBadge';
import type { TimelineBadge } from '../../core/types';

export interface BadgePillProps {
  badge: TimelineBadge;
}

export function BadgePill({ badge }: BadgePillProps) {
  if (badge.type === 'test') {
    if (badge.status === 'failed') {
      return (
        <span className="pill-test-failed">
          <span className="text-red-500">✕</span>
          {badge.label}
        </span>
      );
    }
    if (badge.status === 'passed') {
      return (
        <span className="pill-test-passed">
          <span className="text-emerald-500">✓</span>
          {badge.label}
        </span>
      );
    }
  }

  if (badge.type === 'trace') {
    const title =
      badge.label === 'Unknown'
        ? 'AI attribution unavailable'
        : `AI attribution: ${badge.label}`;
    const className = badge.label === 'Unknown' ? 'pill-trace-unknown' : 'pill-trace-ai';
    return <span className={className} title={title}>{badge.label}</span>;
  }

  if (badge.type === 'anchor') {
    const meta = badge.anchor;
    const presentCount = meta
      ? Number(meta.hasAttributionNote) + Number(meta.hasSessionsNote) + Number(meta.hasLineageNote)
      : null;
    const title = meta
      ? `Story Anchors — Attribution: ${meta.hasAttributionNote ? '✓' : '—'} · Sessions: ${
          meta.hasSessionsNote ? '✓' : '—'
        } · Lineage: ${meta.hasLineageNote ? '✓' : '—'}`
      : 'Story Anchors';
    const className =
      badge.status === 'passed'
        ? 'pill-anchor-passed'
        : badge.status === 'failed'
          ? 'pill-anchor-missing'
          : 'pill-anchor-partial';

    return (
      <span className={className} title={title}>
        {badge.label}
        {typeof presentCount === 'number' ? (
          <span className="ml-1 font-mono text-[10px] opacity-80">{presentCount}/3</span>
        ) : null}
      </span>
    );
  }

  if (badge.type === 'contribution' && badge.stats) {
    return (
      <AiContributionBadge
        stats={{
          aiPercentage: badge.stats.aiPercentage,
          primaryTool: badge.stats.tool,
          model: badge.stats.model,
          humanLines: 0,
          aiAgentLines: 0,
          aiAssistLines: 0,
          collaborativeLines: 0,
          totalLines: 0,
        }}
      />
    );
  }

  return <span className="pill-file">{badge.label}</span>;
}
