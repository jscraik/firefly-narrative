import type { IntentItem } from '../../core/types';

export function IntentList({ items }: { items: IntentItem[] }) {
  return (
    <div className="card p-5">
      <div className="section-header">INTENT</div>
      <div className="section-subheader mt-0.5">based on prompts / commit messages</div>

      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-4 group">
            <div className="flex items-start gap-3 flex-1">
              <span className="intent-arrow mt-1 text-text-muted text-lg leading-none transition-transform duration-150 ease-out group-hover:translate-x-0.5">→</span>
              <span className="text-sm text-text-secondary leading-relaxed">{it.text}</span>
            </div>
            {it.tag ? (
              <span className="pill-file shrink-0">
                {it.tag}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
