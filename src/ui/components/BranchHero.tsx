import { GitBranch } from 'lucide-react';
import type { BranchViewModel } from '../../core/types';

/**
 * BranchHero — Minimal header for the Command Center pattern.
 *
 * Just the essentials: branch name + one-line narrative summary.
 * Details are revealed through timeline interaction, not cluttered here.
 */
export function BranchHero({
  model,
  onBack,
  isFilteredView,
}: {
  model: BranchViewModel;
  onBack?: () => void;
  isFilteredView?: boolean;
}) {
  const commitCount = model.timeline.filter((n) => n.type === 'commit').length;
  const fileCount = model.stats.files;

  // Build a concise one-liner
  const summary = model.title || `${commitCount} commits across ${fileCount} files`;

  return (
    <header className="flex items-center gap-4 px-6 py-4 bg-bg-secondary/60 backdrop-blur-sm border-b border-border-subtle">
      {/* Branch identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-amber-bg border border-accent-amber-light">
          <GitBranch className="w-4 h-4 text-accent-amber" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-text-primary tracking-tight">
            {model.meta?.branchName || 'main'}
          </h1>
          <p className="text-sm text-text-tertiary truncate max-w-md">
            {summary}
          </p>
        </div>
      </div>

      {/* Quick stats as subtle pills */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border-subtle text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">{commitCount}</span>
          commits
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-primary border border-border-subtle text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">{fileCount}</span>
          files
        </span>
      </div>

      {/* Filter indicator */}
      {isFilteredView && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue-bg text-xs font-medium text-accent-blue hover:bg-accent-blue-bg/80 transition-colors"
        >
          Back to dashboard
        </button>
      )}
    </header>
  );
}
