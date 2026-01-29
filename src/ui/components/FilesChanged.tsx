import { useRef, useEffect } from 'react';
import type { FileChange } from '../../core/types';
import { useFileSelection } from '../../core/context/FileSelectionContext';

function formatDelta(n: number) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}`;
}

export function FilesChanged({
  files,
  title
}: {
  files: FileChange[];
  title?: string;
}) {
  const { selectedFile, selectFile } = useFileSelection();
  const fileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Scroll selected file into view
  useEffect(() => {
    if (selectedFile) {
      const el = fileRefs.current.get(selectedFile);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedFile]);

  return (
    <div className="card p-5">
      <div className="section-header">{title ?? 'FILES CHANGED'}</div>
      <div className="mt-4 divide-y divide-stone-100 border border-stone-100 rounded-lg overflow-hidden">
        {files.length === 0 ? (
          <div className="p-4 text-sm text-stone-400">No file changes to show.</div>
        ) : (
          files.map((f) => (
            <button
              key={f.path}
              ref={(el) => {
                if (el) fileRefs.current.set(f.path, el);
              }}
              type="button"
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                selectedFile === f.path 
                  ? 'bg-sky-50' 
                  : 'hover:bg-stone-50'
              }`}
              onClick={() => selectFile(f.path)}
            >
              <div className={`truncate font-mono text-[12px] ${
                selectedFile === f.path ? 'text-sky-700' : 'text-stone-600'
              }`}>
                {f.path}
              </div>
              <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums">
                <span className="text-emerald-600">{formatDelta(f.additions)}</span>
                <span className="text-red-500">-{f.deletions}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
