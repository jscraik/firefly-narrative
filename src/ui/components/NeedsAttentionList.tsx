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
      <div className="section-subheader mt-0.5">Auto‑import issues requiring action</div>
      <div className="mt-3 space-y-3">
        {issues.map((issue) => (
          <div key={issue.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-800">{issue.title}</div>
            <div className="text-[11px] text-amber-700 mt-1 whitespace-pre-wrap">{issue.message}</div>
            <div className="mt-2 flex items-center gap-2">
              {issue.action ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                  onClick={issue.action.handler}
                >
                  {issue.action.label}
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-stone-100"
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
