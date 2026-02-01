import type { FileStats } from '../../../core/attribution-api';
import type { DashboardFilter } from '../../../core/types';

interface TopFilesTableProps {
  files: FileStats[];
  hasMore: boolean;
  isLoading?: boolean;
  onFileClick: (filter: DashboardFilter) => void;
  onLoadMore: () => void;
}

/**
 * TopFilesTable — Displays ranked list of files by AI contribution.
 *
 * Per dashboard-motion-spec.yml:
 * - Row hover: bg-sky-50, 150ms ease-out
 * - Row focus: box-shadow inset (2px 0 0 sky-500)
 * - Load more: button opacity transition during loading
 * - Reduced motion: instant hover, no transition
 */
export function TopFilesTable({
  files,
  hasMore,
  isLoading = false,
  onFileClick,
  onLoadMore,
}: TopFilesTableProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No files data available for this time range.
      </div>
    );
  }

  return (
    <section data-top-files-table>
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Top AI-Contributed Files
      </h2>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th
                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-left"
                scope="col"
              >
                File
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right"
                scope="col"
              >
                AI %
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right"
                scope="col"
              >
                AI Lines
              </th>
              <th
                className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right"
                scope="col"
              >
                Commits
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <TableRow
                key={file.filePath}
                file={file}
                index={index}
                onClick={() =>
                  onFileClick({
                    type: 'file',
                    value: file.filePath,
                    dateRange: undefined, // Caller should provide if needed
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <LoadMoreButton onClick={onLoadMore} isLoading={isLoading} />
        </div>
      )}
    </section>
  );
}

interface TableRowProps {
  file: FileStats;
  index: number;
  onClick: () => void;
}

/**
 * TableRow — Individual table row with hover/focus states.
 *
 * Motion per dashboard-motion-spec.yml:
 * - Row hover: bg-sky-50, 150ms ease-out
 * - Row focus: box-shadow inset (2px 0 0 sky-500), instant
 * - Reduced motion: instant bg change only
 *
 * Keyboard: Enter/Space triggers onClick, Tab navigates between rows
 */
function TableRow({ file, index, onClick }: TableRowProps) {
  const rowStyle = {
    animationDelay: `${200 + index * 30}ms`, // Stagger after metrics grid
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      className="border-b border-slate-100 last:border-b-0 hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 cursor-pointer transition-colors duration-150 ease-out animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-forwards"
      style={rowStyle}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <td className="px-4 py-3 text-sm text-slate-700 font-medium truncate max-w-[200px]" title={file.filePath}>
        {file.filePath}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">
        {file.aiPercentage.toFixed(0)}%
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">
        {file.aiLines.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 text-right tabular-nums">
        {file.commitCount}
      </td>
    </tr>
  );
}

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

/**
 * LoadMoreButton — Pagination button with loading state.
 *
 * Motion per dashboard-motion-spec.yml:
 * - Button hover: opacity change
 * - Loading state: opacity 0.5 + visual indicator
 */
function LoadMoreButton({ onClick, isLoading }: LoadMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg
        text-sm font-medium transition-all duration-150 ease-out
        ${
          isLoading
            ? 'text-slate-400 cursor-not-allowed bg-slate-50 opacity-50'
            : 'text-sky-500 hover:text-sky-600 hover:bg-sky-50 active:bg-sky-100'
        }
      `}
      aria-label={isLoading ? 'Loading more files...' : 'Load more files'}
    >
      {isLoading ? (
        <>
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          <span>Loading...</span>
        </>
      ) : (
        <span>Load more...</span>
      )}
    </button>
  );
}
