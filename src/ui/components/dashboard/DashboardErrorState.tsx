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
        className="mb-6 flex h-16 w-16 animate-shake-once items-center justify-center rounded-full bg-accent-red-bg"
        aria-hidden="true"
      >
        <AlertCircle className="h-8 w-8 text-accent-red" />
      </div>

      {/* Error Message */}
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-xl font-semibold text-text-primary">
          Failed to load dashboard
        </h2>
        <p className="mb-6 text-sm text-text-secondary">{error}</p>

        {/* Retry Button */}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
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
