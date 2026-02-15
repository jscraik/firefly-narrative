import type { IngestIssue } from '../../hooks/useAutoIngest';

export function NeedsAttentionList(props: {
  issues: IngestIssue[];
  onDismiss: (id: string) => void;
}) {
  const { issues, onDismiss } = props;
  if (issues.length === 0) return null;

  return (
    <div className="card p-4">
      <div className="section-header">NEEDS ATTENTION</div>
      <div className="section-subheader">Auto‑import issues requiring action</div>
      <div className="mt-3 space-y-3">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded-lg border border-accent-amber-light bg-accent-amber-bg p-3">
            <div className="text-xs font-semibold text-accent-amber">{issue.title}</div>
            <div className="mt-1 whitespace-pre-wrap text-[11px] text-text-secondary">{issue.message}</div>
            <div className="mt-2 flex items-center gap-2">
              {issue.action ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-accent-amber-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber-light"
                  onClick={issue.action.handler}
                >
                  {issue.action.label}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-border-light bg-bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover"
                onClick={() => onDismiss(issue.id)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
