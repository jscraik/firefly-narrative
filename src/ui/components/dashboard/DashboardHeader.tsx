import { Calendar, ChevronDown } from 'lucide-react';
import type { TimeRange, TimeRangePreset } from '../../../core/types';
import { TIME_RANGE_PRESETS } from './timeRangeUtils';

interface DashboardHeaderProps {
  repoName: string | null;
  repoPath?: string;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  lastUpdated?: Date;
}

export function DashboardHeader({
  repoName,
  repoPath,
  timeRange,
  onTimeRangeChange,
  lastUpdated,
}: DashboardHeaderProps) {
  return (
    <header
      data-dashboard-header
      className="sticky top-0 z-10 h-16 bg-white border-b border-slate-200 px-6"
    >
      <div className="flex items-center justify-between h-full">
        {/* Left: Repo info */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-900">
            {repoName || 'Dashboard'}
          </h1>
          {repoPath && (
            <span className="text-sm text-slate-500">
              {repoPath}
            </span>
          )}
        </div>

        {/* Right: Time range picker + last updated */}
        <div className="flex items-center gap-4">
          {/* Time Range Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="relative">
              <select
                value={typeof timeRange === 'string' ? timeRange : '30d'}
                onChange={(e) => {
                  const value = e.target.value as TimeRangePreset;
                  onTimeRangeChange(value);
                }}
                className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-md pl-3 pr-8 py-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
              >
                {TIME_RANGE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
