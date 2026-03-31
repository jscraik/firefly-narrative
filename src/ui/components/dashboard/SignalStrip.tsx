export type BriefTone = "blue" | "green" | "amber" | "violet";

export type BriefSignal = {
	label: string;
	value: string;
	tone: BriefTone;
	detail: string;
};

// ─── Tone maps ───────────────────────────────────────────────────────────────

export const TONE_DOT: Record<BriefTone, string> = {
	blue: "bg-accent-blue",
	green: "bg-accent-green",
	amber: "bg-accent-amber",
	violet: "bg-accent-violet",
};

export const TONE_VALUE: Record<BriefTone, string> = {
	blue: "text-accent-blue",
	green: "text-accent-green",
	amber: "text-accent-amber",
	violet: "text-accent-violet",
};

export const TONE_BADGE: Record<BriefTone, string> = {
	blue: "border-accent-blue-light bg-accent-blue/10 text-accent-blue",
	green: "border-accent-green-light bg-accent-green-bg text-accent-green",
	amber: "border-accent-amber-light bg-accent-amber-bg text-accent-amber",
	violet: "border-accent-violet-light bg-accent-violet/10 text-accent-violet",
};

export const TONE_PANEL: Record<BriefTone, string> = {
	blue: "border-accent-blue-light/70 bg-[linear-gradient(180deg,rgba(96,165,250,0.10),rgba(9,12,18,0.98))]",
	green:
		"border-accent-green-light/70 bg-[linear-gradient(180deg,rgba(74,222,128,0.10),rgba(9,12,18,0.98))]",
	amber:
		"border-accent-amber-light/70 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(9,12,18,0.98))]",
	violet:
		"border-accent-violet-light/70 bg-[linear-gradient(180deg,rgba(167,139,250,0.12),rgba(9,12,18,0.98))]",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function compactNumber(value: number): string {
	return new Intl.NumberFormat("en-GB", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
}

export function buildTrendLabel(value: number, previous?: number): string {
	if (previous === undefined) return "No prior window";
	const delta = value - previous;
	if (delta === 0) return "Flat vs previous window";
	return `${delta > 0 ? "+" : ""}${delta.toLocaleString()} vs previous window`;
}

// ─── SignalStrip (local compact KPI row) ──────────────────────────────────────
// Replaces the 4-column large-value card grid.
// Renders each signal as a h-12 horizontal tile with coloured value + dot.

export function SignalStrip({ signals }: { signals: BriefSignal[] }) {
	return (
		<ul
			className="grid grid-cols-2 gap-4 lg:grid-cols-4"
			aria-label="Dashboard key metrics"
		>
			{signals.map((s) => (
				<li
					key={s.label}
					title={s.detail}
					className={`rounded-[1.35rem] border p-4 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.78)] ${TONE_PANEL[s.tone]}`}
				>
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span
									className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
									aria-hidden="true"
								/>
								<span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
									{s.label}
								</span>
							</div>
							<div className="mt-3 text-[2rem] font-semibold tracking-[-0.03em] text-text-primary">
								{s.value}
							</div>
						</div>
						<span
							className={`inline-flex rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.16em] ${TONE_BADGE[s.tone]}`}
						>
							{s.tone === "amber"
								? "watch"
								: s.tone === "green"
									? "ready"
									: "signal"}
						</span>
					</div>
					<p className="mt-3 text-sm leading-6 text-text-secondary">
						{s.detail}
					</p>
				</li>
			))}
		</ul>
	);
}
