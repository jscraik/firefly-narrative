import { AlertCircle, Bot, FolderOpen, GitCommit, BarChart3 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { DashboardEmptyReason } from '../../../core/types';

interface DashboardEmptyStateProps {
  reason: DashboardEmptyReason;
  onOpenRepo?: () => void;
}

// =============================================================================
// EMPTY STATE CONFIGURATIONS
// =============================================================================
const EMPTY_STATES: Record<DashboardEmptyReason, EmptyStateConfig> = {
  'no-repo': {
    icon: <BarChart3 className="h-10 w-10 text-text-secondary" />,
    title: 'No repository selected',
    message: 'Open a repository using the button in the top navigation to view AI contribution analytics.',
    delight: null,
  },

  'no-commits': {
    icon: <GitCommit className="h-10 w-10 text-text-muted" />,
    title: 'No commits in this time range',
    message: 'There are no commits in the selected time period. Try a different range or create some commits!',
    delight: 'Every commit tells a story.',
  },

  'no-ai': {
    icon: <Bot className="h-10 w-10 text-text-muted" />,
    title: 'No AI contributions detected',
    message: 'Import AI coding sessions (Claude Code, Codex, Cursor) to see attribution data and track your AI usage.',
    delight: 'Start your AI journey.',
  },

  'no-attribution': {
    icon: <AlertCircle className="h-10 w-10 text-text-muted" />,
    title: 'No attribution data available',
    message: 'AI sessions exist but couldn\'t be linked to commits. Check your linking settings or try manual linking.',
    delight: 'Connecting the dots...',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================
export function DashboardEmptyState({ reason, onOpenRepo }: DashboardEmptyStateProps) {
  const config = EMPTY_STATES[reason];

  return (
    <output
      className="dashboard-empty-state flex flex-col items-center justify-center min-h-[500px] px-6 py-12 animate-in fade-in duration-500"
    >
      {/* Icon Container */}
      <div
        className="icon-container mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border-light bg-bg-card shadow-sm"
        aria-hidden="true"
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="content max-w-md text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-3">
          {config.title}
        </h2>
        <p className="text-base text-text-secondary leading-relaxed">
          {config.message}
        </p>

        {/* Delight Message - only show if provided */}
        {config.delight && (
          <p
            className="delight text-sm text-text-tertiary mt-8"
            aria-hidden="true"
          >
            {config.delight}
          </p>
        )}
      </div>
    </output>
  );
}

// =============================================================================
// TYPES
// =============================================================================
interface EmptyStateConfig {
  icon: ReactNode;
  title: string;
  message: string;
  delight: string | null;
}
