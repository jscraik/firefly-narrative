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
      return `${baseClasses} bg-orange-50 text-orange-700 border border-orange-200`;
    case 'codex':
      return `${baseClasses} bg-emerald-50 text-emerald-700 border border-emerald-200`;
    case 'cursor':
      return `${baseClasses} bg-indigo-50 text-indigo-700 border border-indigo-200`;
    case 'gemini':
      return `${baseClasses} bg-blue-50 text-blue-700 border border-blue-200`;
    case 'copilot':
      return `${baseClasses} bg-purple-50 text-purple-700 border border-purple-200`;
    case 'continue':
      return `${baseClasses} bg-cyan-50 text-cyan-700 border border-cyan-200`;
    case 'kimi':
      return `${baseClasses} bg-rose-50 text-rose-700 border border-rose-200`;
    default:
      return `${baseClasses} bg-slate-50 text-slate-700 border border-slate-200`;
  }
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
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-orange-50 via-purple-50 to-blue-50 text-slate-700 border border-slate-200"
        title={`Sessions: ${badge.sessionTools.join(', ')}`}
      >
        <Bot className="w-3 h-3" />
        {badge.label}
      </span>
    );
  }

  return <span className="pill-file">{badge.label}</span>;
}
