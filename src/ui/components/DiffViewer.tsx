function lineClass(line: string) {
  if (line.startsWith('@@')) return 'diff-line-hunk';
  if (line.startsWith('+') && !line.startsWith('+++')) return 'diff-line-add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'diff-line-del';
  return '';
}

export function DiffViewer(props: { title: string; diffText: string | null; loading?: boolean }) {
  const { title, diffText, loading } = props;

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 bg-stone-50/50">
        <div className="truncate font-mono text-[12px] text-stone-600">{title}</div>
        {loading ? <div className="text-xs text-stone-400">Loading…</div> : null}
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 bg-white">
        {!diffText ? (
          <div className="text-sm text-stone-400">Select a file to view its diff.</div>
        ) : (
          <pre className="text-[12px] leading-relaxed text-stone-700 font-mono">
            {diffText.split(/\r?\n/).map((line, idx) => (
              <div key={idx} className={`${lineClass(line)} px-2 -mx-2`}>
                {line || ' '}
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}
