import { Link2, Sparkles, Terminal, Code2, Wand2, Bot, MessageSquare, Cpu } from 'lucide-react';
import type { TimelineNode, SessionBadgeTool } from '../../core/types';
import { BadgePill } from './BadgePill';

export interface TimelineNodeProps {
  node: TimelineNode;
  selected: boolean;
  pulsing: boolean;
  onSelect: () => void;
}

/**
 * Get the icon component for a session tool (for overlay)
 */
function getToolOverlayIcon(tool: SessionBadgeTool) {
  const className = "w-2.5 h-2.5";
  switch (tool) {
    case 'claude-code':
      return <Sparkles className={className} />;
    case 'codex':
      return <Terminal className={className} />;
    case 'cursor':
      return <Code2 className={className} />;
    case 'gemini':
      return <Wand2 className={className} />;
    case 'copilot':
      return <Bot className={className} />;
    case 'continue':
      return <MessageSquare className={className} />;
    case 'kimi':
      return <Cpu className={className} />;
    default:
      return <Link2 className={className} />;
  }
}

export function TimelineNodeComponent({ node, selected, pulsing, onSelect }: TimelineNodeProps) {
  // Always show labels now that we have truncation, to ensure Repo view matches Demo view density
  // Always show labels now that we have truncation, to ensure Repo view matches Demo view density
  const showLabel = true;
  const sessionBadge = node.badges?.find(b => b.type === 'session');
  const hasSession = !!sessionBadge;
  const primaryTool = sessionBadge?.sessionTools?.[0] ?? null;
  const badges = node.badges ?? [];
  const anchorBadge = badges.find((b) => b.type === 'anchor');
  const nonAnchorBadges = badges.filter((b) => b.type !== 'anchor');
  const visibleBadges = (anchorBadge
    ? [...nonAnchorBadges.slice(0, 2), anchorBadge]
    : nonAnchorBadges.slice(0, 3)
  ).slice(0, 3);

  return (
    <div
      data-node-id={node.id}
      className="relative flex flex-col items-center"
      style={{ minWidth: '100px' }}
    >
      {/* Label above with tooltip for truncated text */}
      {showLabel && node.label ? (
        <div 
          className="mb-2 w-32 text-center text-[11px] font-medium text-text-secondary leading-tight px-1"
          title={node.label}
        >
          <span className="block truncate">{node.label}</span>
        </div>
      ) : (
        <div className="mb-2 h-4" />
      )}

      {/* Dot with selection glow */}
      <button
        type="button"
        className={`timeline-dot transition-all duration-150 ${node.status || 'ok'} ${selected ? 'selected' : ''} ${hasSession ? 'has-session' : ''} ${pulsing ? 'pulse-once' : ''}`}
        onClick={onSelect}
        title={node.label ?? node.id}
        aria-label={node.label ?? node.id}
        aria-current={selected ? 'true' : undefined}
      >
        {/* Session badge overlay on dot */}
        {sessionBadge && (
          <span className="session-badge-overlay">
            {primaryTool ? getToolOverlayIcon(primaryTool) : <Link2 className="w-2.5 h-2.5" />}
          </span>
        )}
      </button>

      {/* Badges below dot */}
      {visibleBadges.length > 0 && (
        <div className="mt-2 flex flex-col items-center gap-1">
          {visibleBadges.map((badge) => (
              <BadgePill key={`${badge.type}-${badge.label ?? badge.status ?? 'badge'}`} badge={badge} />
            ))}
        </div>
      )}

      {/* Date below */}
      <div className="mt-2 h-4 text-[10px] text-text-muted">
        {showLabel && node.atISO
          ? new Date(node.atISO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : ''}
      </div>
    </div>
  );
}
