import { useEffect, useMemo, useState } from 'react';
import { Link2, Wrench, FileText, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import type { TraceCommitSummary } from '../../core/types';
import { getCommitCaptureBundle, type CommitCaptureBundle } from '../../core/tauri/activity';

export function StepsSummaryCard(props: {
  repoId: number;
  repoRoot: string;
  commitSha: string;
  traceSummary?: TraceCommitSummary;
}) {
  const { repoId, repoRoot, commitSha, traceSummary } = props;
  const [expanded, setExpanded] = useState(false);
  const [bundle, setBundle] = useState<CommitCaptureBundle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const b = await getCommitCaptureBundle(repoId, repoRoot, commitSha);
        if (cancelled) return;
        setBundle(b);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [repoId, repoRoot, commitSha]);

  const linkedCount = bundle?.linkedSessions?.length ?? 0;
  const hasTrace = Boolean(traceSummary);

  const tools = useMemo(() => {
    const fromBundle = bundle?.toolsUsedTop ?? [];
    const fromTrace = traceSummary?.toolNames ?? [];
    const set = new Set([...fromBundle, ...fromTrace]);
    return Array.from(set).filter(Boolean).slice(0, 3);
  }, [bundle, traceSummary]);

  const filesTouched = useMemo(() => {
    const fromGit = bundle?.gitFilesChangedTop ?? [];
    const fromSessions = (bundle?.linkedSessions ?? []).flatMap((s) => s.filesTouched ?? []);
    const set = new Set([...fromGit, ...fromSessions]);
    return Array.from(set).filter(Boolean).slice(0, 3);
  }, [bundle]);

  // Don't show card if there's no data at all
  if (!loading && linkedCount === 0 && tools.length === 0 && filesTouched.length === 0 && !hasTrace) {
    return null;
  }

  return (
    <div className="card p-4">
      {/* Header with key metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {linkedCount > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <Link2 className="w-3.5 h-3.5 text-accent-blue" />
              <span className="font-medium">{linkedCount}</span>
              <span className="text-text-muted">session{linkedCount !== 1 ? 's' : ''} linked</span>
            </div>
          ) : null}
          
          {hasTrace && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <Activity className="w-3.5 h-3.5 text-accent-green" />
              <span className="text-text-muted">Trace captured</span>
            </div>
          )}
        </div>
        
        {(tools.length > 0 || filesTouched.length > 0) && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-text-muted hover:text-text-secondary flex items-center gap-1 transition-colors"
          >
            {expanded ? (
              <>Less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>More <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-light space-y-3">
          {tools.length > 0 && (
            <div className="flex items-start gap-2">
              <Wrench className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Tools used</div>
                <div className="flex flex-wrap gap-1.5">
                  {tools.map(tool => (
                    <span key={tool} className="px-2 py-0.5 bg-bg-page rounded text-[11px] text-text-secondary">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {filesTouched.length > 0 && (
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Files touched</div>
                <div className="text-[11px] text-text-secondary">
                  {filesTouched.join(', ')}
                  {filesTouched.length >= 3 && '...'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
