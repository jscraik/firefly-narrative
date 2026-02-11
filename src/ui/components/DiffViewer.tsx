import type { TraceRange, TraceContributorType } from '../../core/types';

function lineClass(line: string) {
  if (line.startsWith('@@')) return 'diff-line-hunk';
  if (line.startsWith('+') && !line.startsWith('+++')) return 'diff-line-add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'diff-line-del';
  return '';
}

type TraceLineInfo = { type: TraceContributorType };

function buildTraceLineLookup(ranges: TraceRange[]) {
  const lookup = new Map<number, TraceLineInfo>();

  for (const range of ranges) {
    const type = range.contributor?.type ?? 'unknown';
    for (let line = range.startLine; line <= range.endLine; line += 1) {
      if (!lookup.has(line)) lookup.set(line, { type });
    }
  }

  return lookup;
}

function traceClass(type: TraceContributorType) {
  if (type === 'ai') return 'diff-line-trace-ai';
  if (type === 'human') return 'diff-line-trace-human';
  if (type === 'mixed') return 'diff-line-trace-mixed';
  return 'diff-line-trace-unknown';
}

function parseNewFileLineNumber(hunkLine: string) {
  const match = /^@@\\s+-(\\d+),(\\d+)\\s+\\+(\\d+),(\\d+)\\s+@@/.exec(hunkLine);
  if (!match) return null;
  return Number(match[3]);
}

export interface DiffViewerProps {
  /** File title displayed in the header. */
  title: string;
  /** Raw diff text to render. */
  diffText: string | null;
  /** Loading state for skeleton UI. */
  loading?: boolean;
  /** Trace ranges for attribution overlays. */
  traceRanges?: TraceRange[];
}

export function DiffViewer(props: DiffViewerProps) {
  const { title, diffText, loading, traceRanges } = props;
  const traceLookup = traceRanges ? buildTraceLineLookup(traceRanges) : null;

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 bg-bg-subtle/50">
        <div className="truncate font-mono text-[12px] text-text-secondary">{title}</div>

      </div>

      <div className="flex-1 overflow-auto px-4 py-3 bg-white">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-bg-page rounded skeleton-shimmer w-1/4" style={{ animationDelay: '0ms' }} />
            <div className="h-4 bg-bg-page rounded skeleton-shimmer w-full" style={{ animationDelay: '80ms' }} />
            <div className="h-4 bg-bg-page rounded skeleton-shimmer w-5/6" style={{ animationDelay: '160ms' }} />
            <div className="h-4 bg-bg-page rounded skeleton-shimmer w-3/4" style={{ animationDelay: '240ms' }} />
            <div className="h-4 bg-bg-page rounded skeleton-shimmer w-full" style={{ animationDelay: '320ms' }} />
            <div className="h-4 bg-bg-page rounded skeleton-shimmer w-2/3" style={{ animationDelay: '400ms' }} />
          </div>
        ) : !diffText ? (
          <div className="text-sm text-text-muted">Select a file to view its diff.</div>
        ) : (
          <pre className="text-[12px] leading-loose text-text-secondary font-mono">
            {(() => {
              let currentLineNumber = 0;
              let inHunk = false;

              return diffText.split(/\r?\n/).map((line) => {
                if (line.startsWith('@@')) {
                  const nextLine = parseNewFileLineNumber(line);
                  if (nextLine !== null) {
                    currentLineNumber = nextLine;
                    inHunk = true;
                  }
                  return (
                    <div key={`hunk-${line}`} className={`${lineClass(line)} px-2 -mx-2`}>
                      {line || ' '}
                    </div>
                  );
                }

                let traceStyle = '';
                if (inHunk && traceLookup && !line.startsWith('-')) {
                  const traceInfo = traceLookup.get(currentLineNumber);
                  if (traceInfo) traceStyle = traceClass(traceInfo.type);
                }

                const classes = [lineClass(line), traceStyle, 'px-2', '-mx-2'].filter(Boolean).join(' ');
                const lineKey = inHunk ? `line-${currentLineNumber}-${line}` : `meta-${line}`;

                if (inHunk) {
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    currentLineNumber += 1;
                  } else if (!line.startsWith('-') || line.startsWith('---')) {
                    currentLineNumber += 1;
                  }
                }

                return (
                  <div key={lineKey} className={classes}>
                    {line || ' '}
                  </div>
                );
              });
            })()}
          </pre>
        )}
      </div>
    </div>
  );
}
