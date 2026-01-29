import type { BranchViewModel } from '../../core/types';

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'neutral' | 'good' | 'bad' }) {
  const valueClass =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'bad'
        ? 'text-red-500'
        : 'text-stone-700';
  
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-lg font-semibold tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-[11px] text-stone-400">{label}</span>
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

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-stone-100">
        <Stat value={`+${model.stats.added}`} label="added" tone="good" />
        <Stat value={`-${model.stats.removed}`} label="removed" tone="bad" />
        <Stat value={`${model.stats.files}`} label="files" />
        <Stat value={`${model.stats.commits}`} label="commits" />
        <div className="h-5 w-px bg-stone-200" />
        <Stat value={`${model.stats.prompts}`} label="prompts" />
        <Stat value={`${model.stats.responses}`} label="responses" />
      </div>
    </div>
  );
}
