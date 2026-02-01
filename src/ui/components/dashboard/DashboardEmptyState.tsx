import { FolderOpen, GitCommit, Bot, AlertCircle } from 'lucide-react';
import type { DashboardEmptyReason } from '../../../core/types';

interface DashboardEmptyStateProps {
  reason: DashboardEmptyReason;
}

// =============================================================================
// EMPTY STATE CONFIGURATIONS
// =============================================================================
const EMPTY_STATES: Record<DashboardEmptyReason, EmptyStateConfig> = {
  'no-repo': {
    icon: <FolderOpen className="w-16 h-16 text-slate-300" />,
    iconBackground: 'bg-slate-100',
    title: 'No repository selected',
    message: 'Open a repository to view your AI contribution analytics and discover patterns in your code.',
    primaryAction: {
      label: 'Open Repository',
      onClick: () => {/* Trigger repo picker */},
    },
    delight: 'Your code stories are waiting.',
  },

  'no-commits': {
    icon: <GitCommit className="w-16 h-16 text-slate-300" />,
    iconBackground: 'bg-slate-100',
    title: 'No commits in this time range',
    message: 'There are no commits in the selected time period. Try a different range or create some commits!',
    primaryAction: {
      label: 'Select "All Time"',
      onClick: () => {/* Set time range to 'all' */},
    },
    delight: 'Every commit tells a story.',
  },

  'no-ai': {
    icon: <Bot className="w-16 h-16 text-sky-300" />,
    iconBackground: 'bg-sky-50',
    title: 'No AI contributions detected',
    message: 'Import AI coding sessions (Claude Code, Codex, Cursor) to see attribution data and track your AI usage.',
    primaryAction: {
      label: 'Import Sessions',
      onClick: () => {/* Navigate to import */},
    },
    delight: 'Start your AI journey.',
  },

  'no-attribution': {
    icon: <AlertCircle className="w-16 h-16 text-amber-300" />,
    iconBackground: 'bg-amber-50',
    title: 'No attribution data available',
    message: 'AI sessions exist but couldn\'t be linked to commits. Check your linking settings or try manual linking.',
    primaryAction: {
      label: 'Open Link Settings',
      onClick: () => {/* Open settings panel */},
    },
    delight: 'Connecting the dots...',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================
export function DashboardEmptyState({ reason }: DashboardEmptyStateProps) {
  const config = EMPTY_STATES[reason];

  return (
    <output
      className="dashboard-empty-state flex flex-col items-center justify-center min-h-[500px] px-6 py-12 animate-in fade-in duration-500"
    >
      {/* Icon Container */}
      <div
        className={`
          icon-container flex items-center justify-center w-24 h-24
          rounded-2xl mb-6
          ${config.iconBackground}
        `}
        aria-hidden="true"
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="content max-w-md text-center">
        <h2 className="text-2xl font-semibold text-slate-900 mb-3">
          {config.title}
        </h2>
        <p className="text-base text-slate-600 mb-6">
          {config.message}
        </p>

        {/* Actions */}
        <div className="actions flex items-center justify-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg font-medium bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            onClick={config.primaryAction.onClick}
          >
            {config.primaryAction.label}
          </button>
        </div>

        {/* Delight Message */}
        <p
          className="delight text-sm text-slate-400 mt-8 italic"
          aria-hidden="true"
        >
          {config.delight}
        </p>
      </div>
    </output>
  );
}

// =============================================================================
// TYPES
// =============================================================================
interface EmptyStateConfig {
  icon: React.ReactNode;
  iconBackground: string;
  title: string;
  message: string;
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  delight: string;
}
