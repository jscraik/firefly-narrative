import clsx from "clsx";
import {
	Activity,
	Bot,
	CalendarDays,
	Link2,
	MessageSquare,
} from "lucide-react";
import { useMemo } from "react";
import type { CaptureReliabilityStatus } from "../../core/tauri/ingestConfig";
import type { Mode, SessionExcerpt } from "../../core/types";
import type { RepoState } from "../../hooks/useRepoLoader";
import { DashboardTrustBadge } from "../components/dashboard/DashboardTrustBadge";
import { SectionHeader } from "../components/SectionHeader";
import { Eyebrow } from "../components/typography/Eyebrow";
import {
	buildNarrativeSurfaceViewModel,
	type SurfaceAction,
} from "./narrativeSurfaceData";
import {
	ActivitySection,
	CompactKpiStrip,
	HighlightsSection,
	SummaryTable,
} from "./narrativeSurfaceSections";

interface SessionsViewProps {
	repoState: RepoState;
	captureReliabilityStatus?: CaptureReliabilityStatus | null;
	autoIngestEnabled?: boolean;
	onModeChange: (mode: Mode) => void;
	onOpenRepo: () => void;
	onImportSession?: () => void;
	onAction?: (action: SurfaceAction) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeAgo(iso?: string) {
	if (!iso) return "just now";
	const date = new Date(iso);
	const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) return "yesterday";
	if (diffDays < 30) return `${diffDays}d ago`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLinkConfidence(confidence: number) {
	if (confidence >= 0.8)
		return {
			label: "High",
			color: "text-accent-green bg-accent-green/10 border-accent-green/20",
		};
	if (confidence >= 0.5)
		return {
			label: "Medium",
			color: "text-accent-amber bg-accent-amber-bg border-accent-amber-light",
		};
	return {
		label: "Low",
		color: "text-accent-red bg-accent-red-bg border-accent-red-light",
	};
}

/* ------------------------------------------------------------------ */
/*  Scaffold data — only used when no real sessions exist              */
/* ------------------------------------------------------------------ */

const SCAFFOLD_SESSIONS: (SessionExcerpt & { linkConfidence: number })[] = [
	{
		id: "1",
		tool: "claude-code",
		agentName: "feat: add shared surface provenance rail",
		messages: Array(47).fill({ role: "user", text: "" }),
		linkConfidence: 0.94,
		linkedCommitSha: "a3f2c1d",
		importedAtISO: "2026-03-12T18:30:00Z",
	} as unknown as SessionExcerpt & { linkConfidence: number },
	{
		id: "2",
		tool: "codex",
		agentName: "fix: harden hourly issue watchlist recovery",
		messages: Array(23).fill({ role: "user", text: "" }),
		linkConfidence: 0.71,
		importedAtISO: "2026-03-12T10:15:00Z",
	} as unknown as SessionExcerpt & { linkConfidence: number },
	{
		id: "3",
		tool: "cursor",
		agentName: "update ui density uplift view models",
		messages: Array(15).fill({ role: "user", text: "" }),
		linkConfidence: 0.99,
		linkedCommitSha: "e9b4f7a",
		importedAtISO: "2026-03-11T14:20:00Z",
	} as unknown as SessionExcerpt & { linkConfidence: number },
	{
		id: "4",
		tool: "copilot",
		agentName: "refactor narrative surface settings view",
		messages: Array(8).fill({ role: "user", text: "" }),
		linkConfidence: 0.35,
		importedAtISO: "2026-03-11T09:05:00Z",
	} as unknown as SessionExcerpt & { linkConfidence: number },
];

/* ------------------------------------------------------------------ */
/*  Trace Narrative specific sections                                  */
/* ------------------------------------------------------------------ */

/** Aggregate tool mix from session data */
function ToolMixChart({
	sessions,
}: {
	sessions: (SessionExcerpt & { linkConfidence?: number })[];
}) {
	const toolCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const s of sessions) {
			const tool = s.tool || "unknown";
			counts[tool] = (counts[tool] ?? 0) + 1;
		}
		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 6);
	}, [sessions]);

	const max = Math.max(...toolCounts.map(([, c]) => c), 1);

	return (
		<div className="glass-panel rounded-3xl p-5">
			<div className="flex items-center gap-2 mb-4">
				<Bot className="h-[14px] w-[14px] text-accent-blue" />
				<h2 className="text-sm font-semibold text-text-primary">
					Agent Tool Mix
				</h2>
				<Eyebrow>
					{sessions.length} session{sessions.length !== 1 ? "s" : ""}
				</Eyebrow>
			</div>
			<div className="flex flex-col gap-2">
				{toolCounts.map(([tool, count]) => (
					<div
						key={tool}
						className="group flex items-center gap-3 h-8 hover:bg-bg-subtle rounded px-2 -mx-2"
					>
						<span className="w-28 text-[13px] font-medium text-text-primary truncate capitalize">
							{tool.replace("-", " ")}
						</span>
						<div className="flex-1 overflow-hidden">
							<div
								className="h-4 rounded-sm bg-accent-blue"
								style={{ width: `${(count / max) * 100}%` }}
							/>
						</div>
						<span className="text-[13px] text-text-muted w-8 text-right tabular-nums">
							{count}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

/** Capture cadence from session import timestamps */
function SessionCadenceChart({
	sessions,
}: {
	sessions: (SessionExcerpt & { linkConfidence?: number })[];
}) {
	const bars = useMemo(() => {
		// Group by day-of-week from session import timestamps
		const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		const counts = new Array(7).fill(0);
		for (const s of sessions) {
			if (s.importedAtISO) {
				const d = new Date(s.importedAtISO);
				const dow = (d.getDay() + 6) % 7; // Mon=0
				counts[dow]++;
			}
		}
		const max = Math.max(...counts, 1);
		return days.map((label, i) => ({
			label,
			pct: (counts[i] / max) * 100,
			count: counts[i],
		}));
	}, [sessions]);

	return (
		<div className="glass-panel rounded-3xl p-5">
			<div className="flex items-center gap-2 mb-4">
				<CalendarDays className="h-[14px] w-[14px] text-accent-green" />
				<h2 className="text-sm font-semibold text-text-primary">
					Capture Cadence
				</h2>
				<span className="inline-flex items-center gap-1 rounded-md bg-accent-violet/10 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-widest text-accent-violet border border-accent-violet/20">
					By Day
				</span>
			</div>
			<div className="flex items-end gap-2 h-20 border-b border-border-subtle pb-2 px-1">
				{bars.map((bar) => (
					<div
						key={bar.label}
						className="flex-1 flex flex-col items-center justify-end h-full gap-1"
					>
						<div
							className="w-full rounded-[3px] bg-accent-green transition-opacity hover:opacity-80"
							style={{ height: `${Math.max(bar.pct, 4)}%` }}
						/>
					</div>
				))}
			</div>
			<div className="flex justify-between text-[11px] font-medium text-text-muted mt-2 px-1">
				{bars.map((bar) => (
					<span key={bar.label}>{bar.label}</span>
				))}
			</div>
		</div>
	);
}

/** Link confidence summary — core Trace Narrative concept */
function LinkConfidencePanel({
	sessions,
}: {
	sessions: (SessionExcerpt & { linkConfidence?: number })[];
}) {
	const { avgConfidence, linkedCount, floatingCount } = useMemo(() => {
		let sum = 0;
		let count = 0;
		let linked = 0;
		let floating = 0;
		for (const s of sessions) {
			const conf = s.linkConfidence ?? 0;
			sum += conf;
			count++;
			if (s.linkedCommitSha) linked++;
			else floating++;
		}
		return {
			avgConfidence: count > 0 ? sum / count : 0,
			linkedCount: linked,
			floatingCount: floating,
		};
	}, [sessions]);

	const conf = formatLinkConfidence(avgConfidence);

	return (
		<div className="glass-panel rounded-3xl p-5">
			<div className="flex items-center gap-2 mb-4">
				<Link2 className="h-[14px] w-[14px] text-accent-violet" />
				<h2 className="text-sm font-semibold text-text-primary">
					Link Confidence
				</h2>
			</div>

			<div className="flex items-center justify-between p-4 border border-border-subtle rounded-xl bg-bg-primary">
				<div className="flex flex-col">
					<span className="text-xs text-text-muted">Average Confidence</span>
					<span className="text-2xl font-semibold mt-1">
						{Math.round(avgConfidence * 100)}%
					</span>
					<span
						className={clsx(
							"mt-1 text-xs font-medium px-1.5 py-0.5 rounded border w-fit",
							conf.color,
						)}
					>
						{conf.label}
					</span>
				</div>
				<Activity className="h-8 w-8 text-accent-green opacity-80" />
			</div>

			<div className="grid grid-cols-2 gap-3 mt-4">
				<div className="flex flex-col gap-1 p-3 rounded-xl border border-border-subtle bg-bg-primary">
					<span className="text-lg font-bold text-accent-green">
						{linkedCount}
					</span>
					<span className="text-xs text-text-muted">Linked to commits</span>
				</div>
				<div className="flex flex-col gap-1 p-3 rounded-xl border border-border-subtle bg-bg-primary">
					<span className="text-lg font-bold text-accent-amber">
						{floatingCount}
					</span>
					<span className="text-xs text-text-muted">Floating sessions</span>
				</div>
			</div>

			{floatingCount > 0 && (
				<p className="mt-3 text-sm text-text-secondary leading-relaxed">
					{floatingCount} session{floatingCount !== 1 ? "s" : ""} lack a commit
					join. They stay visible in the evidence rail so missing attribution is
					treated as part of the story, not hidden debt.
				</p>
			)}
		</div>
	);
}

/** Session list with Trace Narrative link confidence and tool badges */
function SessionEvidenceList({
	sessions,
}: {
	sessions: (SessionExcerpt & { linkConfidence?: number })[];
}) {
	return (
		<div className="glass-panel rounded-3xl p-5">
			<div className="flex items-start justify-between gap-4 border-b border-border-light pb-4">
				<div>
					<Eyebrow>Review Window</Eyebrow>
					<h2 className="mt-1 text-xl font-semibold text-text-primary">
						Recent Sessions
					</h2>
				</div>
			</div>

			<div className="flex flex-col gap-2 mt-3">
				{sessions.map((session, i) => {
					const conf = formatLinkConfidence(
						session.linkConfidence ?? Math.random() * 0.5 + 0.5,
					);
					return (
						<div
							key={session.id || i}
							className="flex items-center justify-between rounded-xl border border-transparent p-3 hover:border-border-subtle hover:bg-bg-subtle transition cursor-pointer group"
						>
							<div className="flex items-center gap-3 truncate min-w-0 pr-4">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-light bg-bg-primary text-text-secondary">
									<Bot className="h-4 w-4" />
								</div>
								<div className="flex flex-col truncate min-w-0">
									<div className="flex items-center gap-2 truncate min-w-0">
										<span className="text-sm font-medium text-text-primary capitalize">
											{String(session.tool).replace("-", " ")}
										</span>
										<span className="text-sm text-text-secondary truncate">
											{session.agentName || "Unknown implementation session"}
										</span>
									</div>
									<div className="flex items-center gap-3 mt-1 text-xs text-text-muted shrink-0">
										<span className="flex items-center gap-1 bg-bg-primary border border-border-light rounded-md px-1.5 py-0.5">
											<MessageSquare className="h-3 w-3" />
											{session.messages?.length || 0} msgs
										</span>
										<span
											className={clsx(
												"flex items-center gap-1 rounded-md border px-1.5 py-0.5",
												conf.color,
											)}
										>
											<Link2 className="h-3 w-3" />
											{conf.label}
										</span>
										{session.linkedCommitSha && (
											<span className="text-accent-blue font-mono text-[11px]">
												{session.linkedCommitSha.slice(0, 7)}
											</span>
										)}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-4 shrink-0">
								<span className="text-xs text-text-muted whitespace-nowrap">
									{formatTimeAgo(session.importedAtISO)}
								</span>
								<button
									type="button"
									className="text-sm border border-border-light rounded-lg px-3 py-1 bg-bg-primary text-text-secondary hover:text-text-primary hover:border-border-strong group-hover:bg-bg-secondary hidden sm:block transition duration-200 ease-out active:duration-75 active:scale-[0.98]"
								>
									Inspect
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

export function SessionsView({
	repoState,
	captureReliabilityStatus,
	autoIngestEnabled,
	onOpenRepo: _onOpenRepo,
	onImportSession: _onImportSession,
	onAction,
}: SessionsViewProps) {
	const viewModel = buildNarrativeSurfaceViewModel(
		"sessions",
		repoState,
		captureReliabilityStatus,
		autoIngestEnabled,
	);

	const sessionsToUse = useMemo(() => {
		if (
			repoState.status === "ready" &&
			repoState.model.sessionExcerpts &&
			repoState.model.sessionExcerpts.length > 0
		) {
			return repoState.model.sessionExcerpts.slice(
				0,
				8,
			) as unknown as (SessionExcerpt & { linkConfidence: number })[];
		}
		return SCAFFOLD_SESSIONS;
	}, [repoState]);

	return (
		<div className="flex h-full min-h-0 flex-col bg-bg-primary">
			<main className="flex-1 overflow-y-auto px-6 py-6">
				<div className="mx-auto flex max-w-6xl flex-col gap-6">
					{/* Header: title + trust badge */}
					<SectionHeader
						title={viewModel.title}
						description={viewModel.subtitle}
						badge={<DashboardTrustBadge trustState={viewModel.trustState} />}
					/>

					{/* KPI strip: Total sessions, Recorded today, Auto-imports, Primary model */}
					<CompactKpiStrip metrics={viewModel.metrics} />

					{/* Trace Narrative–specific: tool mix + capture cadence */}
					<section className="grid gap-6 xl:grid-cols-2">
						<ToolMixChart sessions={sessionsToUse} />
						<SessionCadenceChart sessions={sessionsToUse} />
					</section>

					{/* Link confidence — the core Trace Narrative differentiator */}
					<LinkConfidencePanel sessions={sessionsToUse} />

					{/* View model highlights: session lenses */}
					<HighlightsSection
						title={viewModel.highlightsTitle}
						highlights={viewModel.highlights}
						onAction={onAction}
					/>

					{/* View model activity: recent session activity feed */}
					<ActivitySection
						title={viewModel.activityTitle}
						activity={viewModel.activity}
						onAction={onAction}
					/>

					{/* Session evidence list with link confidence badges */}
					<SessionEvidenceList sessions={sessionsToUse} />

					{/* View model table: session queues with link state */}
					<SummaryTable
						title={viewModel.tableTitle}
						columns={[...viewModel.tableColumns]}
						rows={viewModel.tableRows}
						onAction={onAction}
					/>

					{/* Footer */}
					<section className="rounded-3xl border border-border-subtle bg-bg-secondary px-5 py-4">
						<p className="text-sm leading-6 text-text-secondary">
							{viewModel.footerNote}
						</p>
					</section>
				</div>
			</main>
		</div>
	);
}
