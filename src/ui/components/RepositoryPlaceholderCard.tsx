import { BarChart3, BookOpen, GitBranch, Link2 } from 'lucide-react';

type PlaceholderVariant = 'repo' | 'dashboard' | 'docs';

export function RepositoryPlaceholderCard({
  className = '',
  variant = 'repo',
}: {
  className?: string;
  variant?: PlaceholderVariant;
}) {
  const isDashboard = variant === 'dashboard';
  const isDocs = variant === 'docs';

  let title = 'No Repository Loaded';
  if (isDashboard) title = 'No Dashboard Loaded';
  if (isDocs) title = 'No Documentation Loaded';

  let message =
    'Narrative will display timeline, docs, and linked sessions as soon as a repository is available.';
  if (isDashboard) {
    message = 'Load a repository to see contribution metrics, trends, and developer insights.';
  } else if (isDocs) {
    message = 'Narrative will render markdown documentation from the .narrative directory once a repository is loaded.';
  }

  return (
    <div className={`card w-full max-w-xl rounded-2xl p-8 shadow-sm animate-in fade-in slide-in-from-bottom-2 motion-page-enter ${className}`.trim()}>
      <div className="mb-6 inline-flex items-center justify-center rounded-2xl border border-border-light bg-bg-tertiary p-5">
        {isDashboard ? (
          <BarChart3 className="h-10 w-10 text-text-muted" />
        ) : isDocs ? (
          <BookOpen className="h-10 w-10 text-text-muted" />
        ) : (
          <GitBranch className="h-10 w-10 text-text-muted" />
        )}
      </div>
      <h3 className="mb-2 text-center text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-text-tertiary">
        {message}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 text-left text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-border-light bg-bg-tertiary p-4">
          <div className="mb-1 text-sm font-semibold text-text-secondary">Explore History</div>
          <div className="text-text-muted">Commit timeline + changed files + context</div>
        </div>
        <div className="rounded-lg border border-border-light bg-bg-tertiary p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <Link2 className="h-3.5 w-3.5 text-text-muted" />
            Link Sessions
          </div>
          <div className="text-text-muted">Claude/Codex/Cursor session attribution</div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs italic text-text-muted">Waiting for repository context…</p>
    </div>
  );
}
