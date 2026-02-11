import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendColor } from '../../../core/attribution-api';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: TrendColor;
  icon?: React.ReactNode;
  index: number;
}

/**
 * MetricCard — Displays a single metric with optional trend indicator.
 *
 * Motion (per dashboard-motion-spec.yml):
 * - Staggered enter: 300ms slide-up-fade with index-based delay
 * - Hover: translate-y(-2px) + shadow, 150ms ease-out
 * - Focus: ring-2 ring-sky-500 ring-offset-2
 * - Press: scale(0.98), 100ms
 * - Reduced motion: opacity only, no stagger
 */
export function MetricCard({ label, value, trend, icon, index }: MetricCardProps) {
  const cardStyle = {
    animationDelay: `${index * 50}ms`, // Stagger: 0ms, 50ms, 100ms, 150ms
  };

  return (
    <section
      className="metric-card group relative p-6 border border-border-light rounded-lg bg-bg-card transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-border-medium focus-within:ring-2 focus-within:ring-accent-blue focus-within:ring-offset-2 focus-within:-translate-y-0.5 focus-within:shadow-md animate-in slide-in-from-bottom-2 fade-in duration-300 fill-mode-forwards"
      style={cardStyle}
      aria-label={`${label}: ${value}${trend ? `, ${trend.label}` : ''}`}
    >
      {/* Label */}
      <div className="text-sm font-medium text-text-secondary mb-2">{label}</div>

      {/* Value + Trend */}
      <div className="flex items-baseline gap-3">
        <div className="text-3xl font-bold text-text-primary tracking-tight">
          {value}
        </div>

        {/* Trend Badge */}
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${trend.color} animate-in zoom-in duration-300`}
            style={{ animationDelay: `${300 + index * 50}ms` }}
          >
            {trend.icon === 'trending_up' && <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />}
            {trend.icon === 'trending_down' && <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />}
            {trend.icon === 'minus' && <Minus className="w-3.5 h-3.5" aria-hidden="true" />}
            <span className="sr-only">{trend.label}</span>
          </span>
        )}

        {/* Optional icon (for tool badge) */}
        {icon && (
          <div className="ml-auto" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      {/* Press state (active) */}
      <style>{`
        .metric-card:active {
          transform: translateY(0) scale(0.98);
        }
        @media (prefers-reduced-motion: reduce) {
          .metric-card {
            animation: none;
            transition: background-color 150ms ease-out, box-shadow 150ms ease-out;
          }
          .metric-card:hover,
          .metric-card:focus-within {
            transform: none;
          }
          .metric-card:active {
            transform: none;
            background-color: var(--bg-hover);
          }
        }
      `}</style>
    </section>
  );
}
