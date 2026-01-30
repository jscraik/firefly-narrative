import type React from 'react';
import { GitCommit, FileText, MessageSquare } from 'lucide-react';
import type { BranchViewModel } from '../../core/types';

function Stat({ value, label, tone, icon: Icon }: { value: string; label: string; tone?: 'neutral' | 'good' | 'bad'; icon?: React.ElementType }) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'bad'
        ? 'text-red-500'
        : 'text-stone-700';
  
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-stone-400" />}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-base font-semibold tabular-nums ${valueClass}`}>{value}</span>
        <span className="text-[11px] text-stone-400">{label}</span>
      </div>
    </div>
  );
}

function StatGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}

export function BranchHeader({ model }: { model: BranchViewModel }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-stone-800">{model.title}</h1>
            <span className="badge-open">{model.status}</span>
          </div>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">{model.description}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-stone-100">
        <StatGroup label="Code">
          <Stat value={`+${model.stats.added}`} label="added" tone="good" />
          <Stat value={`-${model.stats.removed}`} label="removed" tone="bad" />
          <Stat value={`${model.stats.files}`} label="files" icon={FileText} />
        </StatGroup>
        
        <div className="h-5 w-px bg-stone-200" />
        
        <StatGroup label="Git">
          <Stat value={`${model.stats.commits}`} label="commits" icon={GitCommit} />
        </StatGroup>
        
        <div className="h-5 w-px bg-stone-200" />
        
        <StatGroup label="AI">
          <Stat value={`${model.stats.prompts}`} label="prompts" icon={MessageSquare} />
          <Stat value={`${model.stats.responses}`} label="responses" />
        </StatGroup>
      </div>
    </div>
  );
}
