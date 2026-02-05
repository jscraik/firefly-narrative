import type React from 'react';
import { ArrowLeft, GitCommit, FileText, MessageSquare } from 'lucide-react';
import type { BranchViewModel, DashboardFilter } from '../../core/types';

function Stat({ value, label, tone, icon: Icon }: { value: string; label: string; tone?: 'neutral' | 'good' | 'bad'; icon?: React.ElementType }) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'bad'
        ? 'text-red-500'
        : 'text-text-secondary';
  
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-text-muted" />}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-base font-semibold tabular-nums ${valueClass}`}>{value}</span>
        <span className="text-[11px] text-text-muted">{label}</span>
      </div>
    </div>
  );
}

function StatGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}

export function BranchHeader({ model, dashboardFilter, onClearFilter }: { model: BranchViewModel; dashboardFilter?: DashboardFilter | null; onClearFilter?: () => void }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {dashboardFilter && onClearFilter && (
              <button
                type="button"
                onClick={onClearFilter}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to dashboard</span>
              </button>
            )}
            <h1 className="text-2xl font-semibold text-text-primary">{model.title}</h1>
            <span className="badge-open">{model.status}</span>
            {dashboardFilter && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-xs font-medium">
                Filtered view
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-text-tertiary leading-relaxed">{model.description}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-border-subtle">
        <StatGroup label="Code">
          <Stat value={`+${model.stats.added}`} label="added" tone="good" />
          <Stat value={`-${model.stats.removed}`} label="removed" tone="bad" />
          <Stat value={`${model.stats.files}`} label="files" icon={FileText} />
        </StatGroup>
        
        <div className="h-5 w-px bg-border-light" />
        
        <StatGroup label="Git">
          <Stat value={`${model.stats.commits}`} label="commits" icon={GitCommit} />
        </StatGroup>
        
        <div className="h-5 w-px bg-border-light" />
        
        <StatGroup label="AI">
          <Stat value={`${model.stats.prompts}`} label="prompts" icon={MessageSquare} />
          <Stat value={`${model.stats.responses}`} label="responses" />
        </StatGroup>
      </div>
    </div>
  );
}
