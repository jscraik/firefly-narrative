import type { SessionExcerpt } from '../../core/types';
import { useFileSelection } from '../../core/context/FileSelectionContext';

function ToolPill({ tool, durationMin }: { tool: string; durationMin?: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-stone-400">
      <span className="px-2 py-1 bg-stone-100 rounded-md font-mono text-stone-500">
        {tool}
      </span>
      {typeof durationMin === 'number' && (
        <span>{durationMin} min</span>
      )}
    </div>
  );
}

function FilePill({
  file,
  onClick,
  isSelected
}: {
  file: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`pill-file ${isSelected ? 'selected' : ''}`}
    >
      {file}
    </button>
  );
}

export function SessionExcerpts({
  excerpts,
  selectedFile,
  onFileClick
}: {
  excerpts: SessionExcerpt[] | undefined;
  selectedFile?: string | null;
  onFileClick?: (path: string) => void;
}) {
  if (!excerpts || excerpts.length === 0) {
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-header">SESSION EXCERPTS</div>
            <div className="section-subheader mt-0.5">high signal moments</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-stone-400">
          No session data yet.
        </div>
      </div>
    );
  }

  const excerpt = excerpts[0];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-header">SESSION EXCERPTS</div>
          <div className="section-subheader mt-0.5">high signal moments</div>
        </div>
        <ToolPill tool={excerpt.tool} durationMin={excerpt.durationMin} />
      </div>

      <div className="mt-4 space-y-4">
        {excerpt.messages.map((m) => (
          <div
            key={m.id}
            className={m.role === 'user' ? 'message-user p-3' : 'message-assistant p-3'}
          >
            <div className={`text-[10px] font-bold tracking-wider uppercase mb-1 ${
              m.role === 'user' ? 'text-sky-600' : 'text-emerald-600'
            }`}>
              {m.role}
            </div>
            <div className="text-sm text-stone-700 leading-relaxed">{m.text}</div>
            {m.files && m.files.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.files.map((f) => (
                  <FilePill
                    key={f}
                    file={f}
                    isSelected={selectedFile === f}
                    onClick={() => onFileClick?.(f)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
