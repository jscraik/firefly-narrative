import { AiContributionBadge } from './AiContributionBadge';
import type { TimelineBadge, SessionBadgeTool } from '../../core/types';
import { Bot, Code2, Sparkles, Terminal, Wand2, MessageSquare, Cpu } from 'lucide-react';

export interface BadgePillProps {
  badge: TimelineBadge;
}

/**
 * Get the icon component for a session tool
 */
function getToolIcon(tool: SessionBadgeTool) {
  switch (tool) {
    case 'claude-code':
      return <Sparkles className="w-3 h-3" />;
    case 'codex':
      return <Terminal className="w-3 h-3" />;
    case 'cursor':
      return <Code2 className="w-3 h-3" />;
    case 'gemini':
      return <Wand2 className="w-3 h-3" />;
    case 'copilot':
      return <Bot className="w-3 h-3" />;
    case 'continue':
      return <MessageSquare className="w-3 h-3" />;
    case 'kimi':
      return <Cpu className="w-3 h-3" />;
    default:
      return <Bot className="w-3 h-3" />;
  }
}

/**
 * Get CSS classes for tool-specific styling
 */
function getToolClasses(tool: SessionBadgeTool): string {
  const baseClasses = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium';

  switch (tool) {
    case 'claude-code':
      return `${baseClasses} bg-accent-violet-bg text-accent-violet border border-accent-violet-light`;
    case 'codex':
      return `${baseClasses} bg-accent-green-bg text-accent-green border border-accent-green-light`;
    case 'cursor':
      return `${baseClasses} bg-accent-blue-bg text-accent-blue border border-accent-blue-light`;
    case 'gemini':
      return `${baseClasses} bg-accent-amber-bg text-accent-amber border border-accent-amber-light`;
    case 'copilot':
      return `${baseClasses} bg-accent-violet-bg text-accent-violet border border-accent-violet-light`;
    case 'continue':
      return `${baseClasses} bg-accent-blue-bg text-accent-blue border border-accent-blue-light`;
    case 'kimi':
      return `${baseClasses} bg-accent-red-bg text-accent-red border border-accent-red-light`;
    default:
      return `${baseClasses} bg-bg-subtle text-text-secondary border border-border-light`;
  }
}

export function BadgePill({ badge }: BadgePillProps) {
  if (badge.type === 'test') {
    if (badge.status === 'failed') {
      return (
        <span className="pill-test-failed">
          <span className="text-accent-red">✕</span>
          {badge.label}
        </span>
      );
    }
    if (badge.status === 'passed') {
      return (
        <span className="pill-test-passed">
          <span className="text-accent-green">✓</span>
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

  if (badge.type === 'session' && badge.sessionTools && badge.sessionTools.length > 0) {
    // Single tool: show tool-specific styling
    if (badge.sessionTools.length === 1) {
      const tool = badge.sessionTools[0];
      return (
        <span className={getToolClasses(tool)} title={`Session created with ${tool}`}>
          {getToolIcon(tool)}
          {badge.label}
        </span>
      );
    }

    // Multiple tools: show generic with mixed indicator
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-bg-subtle text-text-secondary border border-border-light"
        title={`Sessions: ${badge.sessionTools.join(', ')}`}
      >
        <Bot className="w-3 h-3" />
        {badge.label}
      </span>
    );
  }

  return <span className="pill-file">{badge.label}</span>;
}
