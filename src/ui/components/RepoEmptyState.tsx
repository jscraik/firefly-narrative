import { FolderOpen } from 'lucide-react';

export function RepoEmptyState({ onOpenRepo }: { onOpenRepo: () => void }) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-tertiary">
            <div className="mb-6 rounded-full bg-bg-page p-6">
                <FolderOpen className="h-10 w-10 text-text-muted" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-text-primary">No Repository Open</h3>
            <p className="max-w-sm text-sm text-text-tertiary leading-relaxed">
                Open a git repository to visualize its narrative history, sessions, and intent.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 text-xs">
                <button
                    type="button"
                    onClick={onOpenRepo}
                    className="rounded-lg border border-border-light bg-white p-3 text-left hover:border-border-light hover:shadow-sm transition-all w-full group"
                >
                    <div className="font-semibold text-text-secondary group-hover:text-text-primary">Explore History</div>
                    <div className="mt-1 text-text-muted">View commits & timeline</div>
                </button>
                <button
                    type="button"
                    onClick={onOpenRepo}
                    className="rounded-lg border border-border-light bg-white p-3 text-left hover:border-border-light hover:shadow-sm transition-all w-full group"
                >
                    <div className="font-semibold text-text-secondary group-hover:text-text-primary">Link Sessions</div>
                    <div className="mt-1 text-text-muted">Import Claude/Cursor logs</div>
                </button>
            </div>
        </div>
    );
}
