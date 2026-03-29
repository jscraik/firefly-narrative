/**
 * chartUtils.ts
 * Shared utilities for chart micro-components.
 * Mirrors the approach used in TrendChart.tsx so all charts behave consistently.
 */

import { useEffect, useState } from "react";

// ─── Colour resolution ───────────────────────────────────────────────────────

/**
 * Read a CSS custom property from :root at call time.
 * Falls back to `fallback` if the property is missing or we're in SSR.
 */
export function resolveChartColor(
	variableName: string,
	fallback: string,
): string {
	if (typeof window === "undefined") return fallback;
	const value = window
		.getComputedStyle(document.documentElement)
		.getPropertyValue(variableName)
		.trim();
	return value || fallback;
}

export interface ChartPalette {
	border: string;
	grid: string;
	textPrimary: string;
	textMuted: string;
	accentViolet: string;
	accentGreen: string;
	accentBlue: string;
	accentAmber: string;
	accentRed: string;
	tooltipBackground: string;
	tooltipShadow: string;
	accentVioletShadow: string;
	accentVioletAreaStart: string;
	accentVioletAreaEnd: string;
	bgPrimary: string;
	bgSecondary: string;
}

export function resolveChartPalette(_theme: string): ChartPalette {
	return {
		border: resolveChartColor("--chart-border", "oklch(0.56 0.02 260 / 0.18)"),
		grid: resolveChartColor("--chart-grid", "oklch(0.48 0.02 260 / 0.1)"),
		textPrimary: resolveChartColor("--text-primary", "oklch(0.2 0.02 260)"),
		textMuted: resolveChartColor("--text-muted", "oklch(0.55 0.03 260)"),
		accentViolet: resolveChartColor("--accent-violet", "oklch(0.6 0.2 310)"),
		accentGreen: resolveChartColor("--accent-green", "oklch(0.55 0.2 150)"),
		accentBlue: resolveChartColor("--accent-blue", "oklch(0.6 0.18 255)"),
		accentAmber: resolveChartColor("--accent-amber", "oklch(0.62 0.22 48)"),
		accentRed: resolveChartColor("--accent-red", "oklch(0.58 0.22 28)"),
		tooltipBackground: resolveChartColor(
			"--chart-tooltip-bg",
			"oklch(0.98 0.005 260 / 0.96)",
		),
		tooltipShadow: resolveChartColor(
			"--chart-tooltip-shadow",
			"oklch(0.2 0.02 260 / 0.14)",
		),
		accentVioletShadow: resolveChartColor(
			"--chart-accent-violet-shadow",
			"oklch(0.6 0.2 310 / 0.26)",
		),
		accentVioletAreaStart: resolveChartColor(
			"--chart-accent-violet-area-start",
			"oklch(0.6 0.2 310 / 0.24)",
		),
		accentVioletAreaEnd: resolveChartColor(
			"--chart-accent-violet-area-end",
			"oklch(0.6 0.2 310 / 0)",
		),
		bgPrimary: resolveChartColor("--bg-primary", "oklch(0.98 0.005 260)"),
		bgSecondary: resolveChartColor("--bg-secondary", "oklch(0.95 0.01 260)"),
	};
}

// ─── Tone → palette key ──────────────────────────────────────────────────────

export type ChartTone = "violet" | "green" | "blue" | "amber" | "red" | "slate";

export function toneToColor(palette: ChartPalette, tone: ChartTone): string {
	switch (tone) {
		case "violet":
			return palette.accentViolet;
		case "green":
			return palette.accentGreen;
		case "blue":
			return palette.accentBlue;
		case "amber":
			return palette.accentAmber;
		case "red":
			return palette.accentRed;
		default:
			return palette.textMuted;
	}
}

// ─── Reduced motion hook ─────────────────────────────────────────────────────

/**
 * Returns true when `prefers-reduced-motion: reduce` is active.
 * Listens for runtime changes (e.g. user toggling system preference).
 */
export function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(() => {
		if (
			typeof window === "undefined" ||
			typeof window.matchMedia !== "function"
		)
			return false;
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	});

	useEffect(() => {
		if (
			typeof window === "undefined" ||
			typeof window.matchMedia !== "function"
		)
			return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, []);

	return reduced;
}
