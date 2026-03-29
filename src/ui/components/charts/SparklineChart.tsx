/**
 * SparklineChart.tsx
 *
 * Tiny inline sparkline for table rows and repo chips.
 * Renders as a pure SVG path — no ECharts overhead.
 * No axes, no tooltip — just the trend shape.
 *
 * Props:
 *   data   — array of numbers (values over time, oldest first)
 *   height — px (default 28)
 *   width  — px (default 80), set to 0 to fill container via CSS
 *   tone   — accent tone (default 'violet')
 *   label  — aria-label (default 'Sparkline')
 *   filled — whether to draw area fill under the line (default true)
 */

import { useMemo } from "react";
import { resolveChartColor, usePrefersReducedMotion } from "./chartUtils";

const TONE_COLOR_VARS = {
	violet: {
		stroke: "--chart-sparkline-violet-stroke",
		fill: "--chart-sparkline-violet-fill",
	},
	green: {
		stroke: "--chart-sparkline-green-stroke",
		fill: "--chart-sparkline-green-fill",
	},
	blue: {
		stroke: "--chart-sparkline-blue-stroke",
		fill: "--chart-sparkline-blue-fill",
	},
	amber: {
		stroke: "--chart-sparkline-amber-stroke",
		fill: "--chart-sparkline-amber-fill",
	},
	red: {
		stroke: "--chart-sparkline-red-stroke",
		fill: "--chart-sparkline-red-fill",
	},
	slate: {
		stroke: "--chart-sparkline-slate-stroke",
		fill: "--chart-sparkline-slate-fill",
	},
} as const;

export type SparklineTone = keyof typeof TONE_COLOR_VARS;

interface SparklineChartProps {
	data: number[];
	height?: number;
	width?: number;
	tone?: SparklineTone;
	label?: string;
	filled?: boolean;
}

function buildPath(
	data: number[],
	w: number,
	h: number,
): { line: string; area: string } {
	if (data.length < 2) return { line: "", area: "" };

	const min = Math.min(...data);
	const max = Math.max(...data);
	const range = max - min || 1;

	const pad = 2; // vertical padding px
	const innerH = h - pad * 2;

	const points = data.map((v, i) => ({
		x: (i / (data.length - 1)) * w,
		y: pad + innerH - ((v - min) / range) * innerH,
	}));

	// Smooth cubic bezier
	const lineParts: string[] = [`M ${points[0].x} ${points[0].y}`];
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const cpX = (prev.x + curr.x) / 2;
		lineParts.push(`C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`);
	}

	const last = points[points.length - 1];
	const first = points[0];
	const area = [
		...lineParts,
		`L ${last.x} ${h}`,
		`L ${first.x} ${h}`,
		"Z",
	].join(" ");

	return { line: lineParts.join(" "), area };
}

export function SparklineChart({
	data,
	height = 28,
	width = 80,
	tone = "violet",
	label = "Trend sparkline",
	filled = true,
}: SparklineChartProps) {
	const reduced = usePrefersReducedMotion();
	const colorVars = TONE_COLOR_VARS[tone] ?? TONE_COLOR_VARS.violet;
	const colors = {
		stroke: resolveChartColor(colorVars.stroke, "oklch(0.6 0.2 310 / 0.9)"),
		fill: resolveChartColor(colorVars.fill, "oklch(0.6 0.2 310 / 0.15)"),
	};

	const { line, area } = useMemo(
		() =>
			data.length >= 2
				? buildPath(data, width, height)
				: { line: "", area: "" },
		[data, width, height],
	);

	if (data.length < 2) {
		return (
			<svg
				width={width}
				height={height}
				aria-label={label}
				role="img"
				style={{ display: "block" }}
			>
				<line
					x1={0}
					y1={height / 2}
					x2={width}
					y2={height / 2}
					stroke={colors.stroke}
					strokeWidth={1}
					strokeDasharray="3 3"
					opacity={0.4}
				/>
				<title>{label} — no data</title>
			</svg>
		);
	}

	return (
		<svg
			width={width}
			height={height}
			aria-label={label}
			role="img"
			style={{ display: "block", overflow: "visible" }}
		>
			<title>{label}</title>
			{filled && area && (
				<path
					d={area}
					fill={colors.fill}
					strokeWidth={0}
					style={reduced ? undefined : { transition: "opacity 200ms ease" }}
				/>
			)}
			{line && (
				<path
					d={line}
					fill="none"
					stroke={colors.stroke}
					strokeWidth={1.5}
					strokeLinecap="round"
					strokeLinejoin="round"
					style={reduced ? undefined : { transition: "stroke 200ms ease" }}
				/>
			)}
		</svg>
	);
}
