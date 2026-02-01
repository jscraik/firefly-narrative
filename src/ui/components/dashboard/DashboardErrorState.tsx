import { AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function DashboardErrorState({ error, onRetry }: DashboardErrorStateProps) {
  return (
    <div className="dashboard-error-state flex flex-col items-center justify-center min-h-[500px] px-6 py-12">
      {/* Error Icon */}
      <div
        className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 mb-6 animate-shake-once"
        aria-hidden="true"
      >
        <AlertCircle className="w-8 h-8 text-rose-500" />
      </div>

      {/* Error Message */}
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Failed to load dashboard
        </h2>
        <p className="text-sm text-slate-600 mb-6">{error}</p>

        {/* Retry Button */}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try again</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Add this CSS for shake animation:
 *
 * @keyframes shake {
 *   0%, 100% { transform: translateX(0); }
 *   20% { transform: translateX(-4px); }
 *   40% { transform: translateX(4px); }
 *   60% { transform: translateX(-4px); }
 *   80% { transform: translateX(4px); }
 * }
 *
 * .animate-shake-once {
 *   animation: shake 0.4s ease-in-out;
 * }
 *
 * @media (prefers-reduced-motion: reduce) {
 *   .animate-shake-once {
 *     animation: none;
 *   }
 * }
 */
