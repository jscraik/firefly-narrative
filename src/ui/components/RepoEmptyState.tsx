import { FolderOpen } from 'lucide-react';

export function RepoEmptyState({ onOpenRepo }: { onOpenRepo: () => void }) {
    return (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center text-stone-500">
            <div className="mb-6 rounded-full bg-stone-100 p-6">
                <FolderOpen className="h-10 w-10 text-stone-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-stone-800">No Repository Open</h3>
            <p className="max-w-sm text-sm text-stone-500 leading-relaxed">
                Open a git repository to visualize its narrative history, sessions, and intent.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 text-xs">
                <button
                    type="button"
                    onClick={onOpenRepo}
                    className="rounded-lg border border-stone-200 bg-white p-3 text-left hover:border-stone-300 hover:shadow-sm transition-all w-full group"
                >
                    <div className="font-semibold text-stone-700 group-hover:text-stone-900">Explore History</div>
                    <div className="mt-1 text-stone-400">View commits & timeline</div>
                </button>
                <button
                    type="button"
                    onClick={onOpenRepo}
                    className="rounded-lg border border-stone-200 bg-white p-3 text-left hover:border-stone-300 hover:shadow-sm transition-all w-full group"
                >
                    <div className="font-semibold text-stone-700 group-hover:text-stone-900">Link Sessions</div>
                    <div className="mt-1 text-stone-400">Import Claude/Cursor logs</div>
                </button>
            </div>
        </div>
    );
}
