import { Calendar, ChevronDown } from "lucide-react";
import type {
	DashboardTrustState,
	TimeRange,
	TimeRangePreset,
} from "../../../core/types";
import { DashboardTrustBadge } from "./DashboardTrustBadge";
import { TIME_RANGE_PRESETS } from "./timeRangeUtils";

interface DashboardHeaderProps {
	repoName: string | null;
	repoPath?: string;
	timeRange: TimeRange;
	onTimeRangeChange: (timeRange: TimeRange) => void;
	lastUpdated?: Date;
	trustState?: DashboardTrustState;
	onOpenRepo?: () => void;
	onImportSession?: () => void;
}

export function DashboardHeader({
	repoName,
	repoPath: _repoPath,
	timeRange,
	onTimeRangeChange,
	lastUpdated,
	trustState = "healthy",
	onOpenRepo: _onOpenRepo,
	onImportSession: _onImportSession,
}: DashboardHeaderProps) {
	return (
		<div
			data-dashboard-header
			className="flex items-center justify-between px-6 py-3 border-b border-border-subtle/50"
		>
			{/* Left: Repo name + trust badge */}
			<div className="flex items-center gap-2.5 min-w-0">
				<h1 className="text-sm font-semibold text-text-primary truncate">
					{repoName || "Dashboard"}
				</h1>
				<DashboardTrustBadge trustState={trustState} />
			</div>

			{/* Right: Time range picker + sync indicator */}
			<div className="flex items-center gap-3 shrink-0">
				{/* Time Range Picker */}
				<div className="flex items-center gap-1.5">
					<Calendar className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
					<div className="relative">
						<select
							aria-label="Time range"
							value={typeof timeRange === "string" ? timeRange : "30d"}
							onChange={(e) => {
								const value = e.target.value as TimeRangePreset;
								onTimeRangeChange(value);
							}}
							className="appearance-none bg-transparent hover:bg-bg-hover text-text-secondary text-xs font-medium rounded-md pl-2 pr-6 py-1 transition-colors cursor-pointer border border-border-light"
						>
							{TIME_RANGE_PRESETS.map((preset) => (
								<option key={preset.value} value={preset.value}>
									{preset.label}
								</option>
							))}
						</select>
						<ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-tertiary pointer-events-none" />
					</div>
				</div>

				{/* Sync indicator */}
				{lastUpdated && (
					<>
						<div className="h-3 w-px bg-border-subtle" />
						<span className="text-[0.625rem] uppercase tracking-wider font-medium text-text-muted">
							{lastUpdated.toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					</>
				)}
				<div className="w-1.5 h-1.5 rounded-full bg-accent-green shadow-[var(--shadow-status-success-glow)]" />
			</div>
		</div>
	);
}
