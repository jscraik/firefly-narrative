import { ArrowRight, BookOpen, FlaskConical, RefreshCw, Sparkles, Wrench } from 'lucide-react';
import type { IntentItem, IntentType } from '../../core/types';

// Intent type icons and labels
const INTENT_CONFIG: Record<IntentType, { icon: React.ReactNode; label: string; className: string }> = {
  feature: { icon: <Sparkles className="w-4 h-4" />, label: 'New feature', className: 'text-accent-amber' },
  fix: { icon: <Wrench className="w-4 h-4" />, label: 'Bug fix', className: 'text-accent-red' },
  refactor: { icon: <RefreshCw className="w-4 h-4" />, label: 'Refactor', className: 'text-accent-green' },
  test: { icon: <FlaskConical className="w-4 h-4" />, label: 'Tests', className: 'text-accent-violet' },
  docs: { icon: <BookOpen className="w-4 h-4" />, label: 'Documentation', className: 'text-accent-blue' },
  other: { icon: <ArrowRight className="w-4 h-4" />, label: 'Change', className: 'text-text-muted' },
};

function getIntentType(text: string): IntentType {
  const lower = text.toLowerCase();
  if (lower.includes('fix') || lower.includes('bug') || lower.includes('issue') || lower.includes('error')) return 'fix';
  if (lower.includes('test') || lower.includes('spec')) return 'test';
  if (lower.includes('refactor') || lower.includes('clean') || lower.includes('restructure')) return 'refactor';
  if (lower.includes('doc') || lower.includes('readme') || lower.includes('comment')) return 'docs';
  if (lower.includes('add') || lower.includes('new') || lower.includes('create') || lower.includes('implement')) return 'feature';
  return 'other';
}

export function IntentList({ items }: { items: IntentItem[] }) {
  return (
    <div className="card p-5">
      <div className="section-header">Intent</div>
      <div className="section-subheader">Based on prompts / commit messages</div>

      <div className="mt-3 space-y-2">
        {items.map((it) => {
          const type = it.type ?? getIntentType(it.text);
          const config = INTENT_CONFIG[type];

          return (
            <div key={it.id} className="flex items-start justify-between gap-4 group">
              <div className="flex items-start gap-3 flex-1">
                <span
                  className={`mt-0.5 leading-none transition-transform duration-150 ease-out group-hover:translate-x-0.5 ${config.className}`}
                  title={config.label}
                >
                  {config.icon}
                </span>
                <span className="text-sm text-text-secondary leading-relaxed">{it.text}</span>
              </div>
              {it.tag ? (
                <span className="pill-file shrink-0" title={`Tag: ${it.tag}`}>
                  {it.tag}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
