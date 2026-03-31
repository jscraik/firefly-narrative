/**
 * DashboardLoadingState
 *
 * Skeleton loading state for the dashboard.
 * Matches the final layout 1:1 to prevent layout shift (no jank!).
 * Uses shimmer animation with staggered delays for a polished feel.
 */

export function DashboardLoadingState() {
	return (
		<div className="flex-1 overflow-y-auto px-6 py-5">
			<div className="mx-auto flex max-w-[100rem] flex-col gap-6">
				{/* Header / Brief text */}
				<div className="mb-2 h-14 max-w-md rounded-lg bg-bg-secondary skeleton-shimmer" />

				{/* Row 1: 4 Stat Cards */}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div
						className="h-[104px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "0ms" }}
					/>
					<div
						className="h-[104px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "75ms" }}
					/>
					<div
						className="h-[104px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "150ms" }}
					/>
					<div
						className="h-[104px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "225ms" }}
					/>
				</div>

				{/* Row 2: Charts */}
				<div className="grid gap-4 xl:grid-cols-2">
					<div
						className="h-[212px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "150ms" }}
					/>
					<div
						className="h-[212px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "225ms" }}
					/>
				</div>

				{/* Row 3: Next lanes + Pressure watch */}
				<div className="grid gap-4 xl:grid-cols-2">
					<div
						className="h-[238px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "225ms" }}
					/>
					<div
						className="h-[238px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
						aria-hidden="true"
						style={{ animationDelay: "300ms" }}
					/>
				</div>

				{/* Row 4: Top files */}
				<div
					className="h-[250px] rounded-2xl bg-bg-tertiary shadow-sm skeleton-shimmer"
					aria-hidden="true"
					style={{ animationDelay: "375ms" }}
				/>
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
