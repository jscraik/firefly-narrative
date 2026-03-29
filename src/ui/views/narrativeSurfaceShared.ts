import type { KeyboardEvent } from "react";
import type {
	SurfaceAuthorityCue,
	SurfaceTableRow,
	SurfaceTone,
} from "./narrativeSurfaceData";

export const toneClasses: Record<
	SurfaceTone,
	{ border: string; bg: string; text: string; dot: string }
> = {
	blue: {
		border: "border-accent-blue-light",
		bg: "bg-accent-blue/10",
		text: "text-accent-blue",
		dot: "bg-accent-blue",
	},
	violet: {
		border: "border-accent-violet-light",
		bg: "bg-accent-violet/10",
		text: "text-accent-violet",
		dot: "bg-accent-violet",
	},
	green: {
		border: "border-accent-green-light",
		bg: "bg-accent-green-bg",
		text: "text-accent-green",
		dot: "bg-accent-green",
	},
	amber: {
		border: "border-accent-amber-light",
		bg: "bg-accent-amber-bg",
		text: "text-accent-amber",
		dot: "bg-accent-amber",
	},
	red: {
		border: "border-accent-red-light",
		bg: "bg-accent-red-bg",
		text: "text-accent-red",
		dot: "bg-accent-red",
	},
	slate: {
		border: "border-border-light",
		bg: "bg-bg-primary",
		text: "text-text-secondary",
		dot: "bg-text-muted",
	},
};

export const statusBadgeClasses: Record<
	"ok" | "warn" | "critical" | "info",
	string
> = {
	ok: "border-accent-green-light bg-accent-green-bg text-accent-green",
	warn: "border-accent-amber-light bg-accent-amber-bg text-accent-amber",
	critical: "border-accent-red-light bg-accent-red-bg text-accent-red",
	info: "border-accent-blue-light bg-accent-blue/10 text-accent-blue",
};

export const statusBadgeLabels: Record<
	"ok" | "warn" | "critical" | "info",
	string
> = {
	ok: "OK",
	warn: "WATCH",
	critical: "CRITICAL",
	info: "INFO",
};

export const authorityCueClassByTier: Record<
	SurfaceAuthorityCue["authorityTier"],
	string
> = {
	live_repo: "border-accent-blue-light bg-accent-blue/10 text-accent-blue",
	live_capture:
		"border-accent-green-light bg-accent-green-bg text-accent-green",
	derived_summary:
		"border-accent-violet-light bg-accent-violet/10 text-accent-violet",
	static_scaffold: "border-border-subtle bg-bg-secondary text-text-muted",
	system_signal: "border-accent-red-light bg-accent-red-bg text-accent-red",
};

export function authorityShortLabel(
	tier?: SurfaceAuthorityCue["authorityTier"],
): string {
	switch (tier) {
		case "live_repo":
			return "Repo";
		case "live_capture":
			return "Live";
		case "derived_summary":
			return "Derived";
		case "static_scaffold":
			return "Mock";
		case "system_signal":
			return "Signal";
		default:
			return "Info";
	}
}

export function handleActionKeyDown(
	event: KeyboardEvent<HTMLElement>,
	action: NonNullable<SurfaceTableRow["action"]> | undefined,
	onAction:
		| ((action: NonNullable<SurfaceTableRow["action"]>) => void)
		| undefined,
) {
	if (!action) return;
	if (event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	onAction?.(action);
}
