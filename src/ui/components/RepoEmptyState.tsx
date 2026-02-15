import { FolderOpen, Search, Link2 } from 'lucide-react';

export function RepoEmptyState({ onOpenRepo }: { onOpenRepo: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-tertiary">
      <div className="mb-6 rounded-full bg-bg-page p-6">
        <FolderOpen className="h-10 w-10 text-text-muted" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">No Repository Open</h3>
      <p className="max-w-sm text-sm text-text-tertiary leading-relaxed">
        Open a git repository to visualize its narrative history, sessions, and intent.
      </p>

      {/* Primary CTA - Consistent with Dashboard empty state */}
      <button
        type="button"
        onClick={onOpenRepo}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-surface-strong px-6 py-2.5 text-sm font-medium text-text-inverted shadow-sm transition-colors hover:bg-surface-strong-hover"
      >
        <Search className="w-4 h-4" />
        Open Repository
      </button>

      {/* Secondary options with consistent styling */}
      <div className="mt-8 grid max-w-md grid-cols-2 gap-4 text-xs">
        <div className="rounded-lg border border-border-light bg-bg-card p-4 text-left opacity-60">
          <div className="mb-1 flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-text-muted" />
            <span className="font-semibold text-text-secondary">Explore History</span>
          </div>
          <div className="text-text-muted">View commits & timeline</div>
        </div>
        <div className="rounded-lg border border-border-light bg-bg-card p-4 text-left opacity-60">
          <div className="mb-1 flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-text-muted" />
            <span className="font-semibold text-text-secondary">Link Sessions</span>
          </div>
          <div className="text-text-muted">Import Claude/Cursor logs</div>
        </div>
      </div>

      <p className="mt-6 text-xs italic text-text-muted">Your code stories are waiting.</p>
    </div>
  );
}
