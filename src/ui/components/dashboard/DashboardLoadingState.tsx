/**
 * DashboardLoadingState
 *
 * Skeleton loading state for the dashboard.
 * Matches the final layout 1:1 to prevent layout shift (no jank!).
 */

export function DashboardLoadingState() {
  return (
    <div className="dashboard-container animate-pulse">
      {/* Header Skeleton */}
      <div className="h-16 bg-white border-b border-slate-200 px-6 mb-6" />

      {/* Metrics Grid Skeleton - 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <div className="h-32 bg-slate-200 rounded-lg" aria-hidden="true" />
        <div className="h-32 bg-slate-200 rounded-lg" aria-hidden="true" />
        <div className="h-32 bg-slate-200 rounded-lg" aria-hidden="true" />
        <div className="h-32 bg-slate-200 rounded-lg" aria-hidden="true" />
      </div>

      {/* Table Header Skeleton */}
      <div className="h-8 w-48 bg-slate-200 rounded mb-4" />

      {/* Table Rows Skeleton */}
      <div className="space-y-3">
        <div className="h-12 bg-slate-200 rounded" aria-hidden="true" />
        <div className="h-12 bg-slate-200 rounded" aria-hidden="true" />
        <div className="h-12 bg-slate-200 rounded" aria-hidden="true" />
        <div className="h-12 bg-slate-200 rounded" aria-hidden="true" />
        <div className="h-12 bg-slate-200 rounded" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Add this CSS for shimmer animation:
 *
 * .animate-pulse {
 *   animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
 * }
 *
 * @keyframes pulse {
 *   0%, 100% {
 *     opacity: 1;
 *   }
 *   50% {
 *     opacity: 0.5;
 *   }
 * }
 *
 * For reduced motion:
 *
 * @media (prefers-reduced-motion: reduce) {
 *   .animate-pulse {
 *     animation: none;
 *   }
 * }
 */
