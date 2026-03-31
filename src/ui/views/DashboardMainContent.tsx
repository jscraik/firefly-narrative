import { motion, useReducedMotion } from "framer-motion";
import {
	Activity,
	AlertTriangle,
	ChevronRight,
	CircleDot,
	FileCode2,
	FolderGit2,
	PieChart,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useMemo } from "react";

import {
	type DashboardStats,
	formatToolName,
	type TimeRange,
} from "../../core/attribution-api";
import type {
	DashboardFilter,
	DashboardTrustState,
	PanelStatusMap,
} from "../../core/types";
import type { RepoState } from "../../hooks/useRepoLoader";
import {
	ActivityBarChart,
	type ChartTone,
	MiniBarChart,
} from "../components/charts";
import { BottomStats } from "../components/dashboard/BottomStats";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import {
	type BriefSignal,
	buildTrendLabel,
	compactNumber,
	SignalStrip,
} from "../components/dashboard/SignalStrip";
import { TopFilesTable } from "../components/dashboard/TopFilesTable";

interface DashboardMainContentProps {
	stats: DashboardStats;
	repoState: RepoState;
	timeRange: TimeRange;
	lastUpdated?: Date;
	dashboardTrustState: DashboardTrustState;
	panelStatusMap: PanelStatusMap;
	activeRepoId: number | null;
	visibleFiles: DashboardStats["topFiles"]["files"];
	loadingMore: boolean;
	hasActiveQuery: boolean;
	onTimeRangeChange: (timeRange: TimeRange) => void;
	onImportSession: () => void;
	onModeChange: (mode: "repo" | "hygiene" | "sessions") => void;
	onFileClick: (filter: DashboardFilter) => void;
	onLoadMore: () => void;
}

export function DashboardMainContent({
	stats,
	repoState: _repoState,
	timeRange,
	lastUpdated,
	dashboardTrustState,
	panelStatusMap,
	activeRepoId: _activeRepoId,
	visibleFiles,
	loadingMore,
	hasActiveQuery,
	onTimeRangeChange,
	onImportSession: _onImportSession,
	onModeChange,
	onFileClick,
	onLoadMore,
}: DashboardMainContentProps) {
	const shouldReduceMotion = useReducedMotion();

	const topTool = stats.currentPeriod.toolBreakdown[0];
	const topToolLabel = topTool ? formatToolName(topTool.tool) : "Codex";
	const trustIsHealthy = dashboardTrustState === "healthy";
	const linkedFile = visibleFiles[0];
	const nextFile = visibleFiles[1];
	const aiPct = Math.round(stats.currentPeriod.attribution.aiPercentage);
	const narrativePressureLabel =
		linkedFile != null
			? `Evidence is concentrating in ${linkedFile.filePath}.`
			: "No dominant evidence file has emerged yet.";

	const activityData = useMemo(
		() =>
			stats.currentPeriod.trend.map((point) => ({
				date: point.date,
				value: point.commitCount,
			})),
		[stats.currentPeriod.trend],
	);

	const toolChartData = useMemo(
		() =>
			stats.currentPeriod.toolBreakdown.slice(0, 5).map((tool) => ({
				label: formatToolName(tool.tool),
				value: tool.lineCount,
				tone: "violet" as ChartTone,
			})),
		[stats.currentPeriod.toolBreakdown],
	);

	const briefSignals = useMemo<BriefSignal[]>(
		() => [
			{
				label: "Commits moved",
				value: `${stats.currentPeriod.period.commits}`,
				tone: "blue",
				detail: buildTrendLabel(
					stats.currentPeriod.period.commits,
					stats.previousPeriod?.period.commits,
				),
			},
			{
				label: "Attributed lines",
				value: compactNumber(stats.currentPeriod.attribution.totalLines),
				tone: "violet",
				detail: `${aiPct}% AI-linked evidence in this window.`,
			},
			{
				label: "Top tool lane",
				value: topToolLabel,
				tone: "green",
				detail: topTool
					? `${topTool.lineCount.toLocaleString()} lines in the current window.`
					: "No dominant tool in the current window.",
			},
			{
				label: "Trust posture",
				value: trustIsHealthy ? "Ready" : "Trust gate",
				tone: trustIsHealthy ? "green" : "amber",
				detail: trustIsHealthy
					? "Capture is healthy. Move directly into repo evidence."
					: "Resolve capture posture before repeating the branch story.",
			},
		],
		[
			stats.currentPeriod.period.commits,
			stats.previousPeriod?.period.commits,
			stats.currentPeriod.attribution.totalLines,
			aiPct,
			topTool,
			topToolLabel,
			trustIsHealthy,
		],
	);

	const sessionLane = [
		{
			title: "Open repo evidence",
			detail: linkedFile
				? `Start with ${linkedFile.filePath} and walk back to commits, sessions, and diffs.`
				: "Start from the highest-signal file and verify the branch story directly.",
			action: () => onModeChange("repo"),
			icon: FolderGit2,
		},
		{
			title: "Resolve trust posture",
			detail: trustIsHealthy
				? "Trust Center stays green, but stay here if capture drifts."
				: "Trust Center should decide what is still provisional before cleanup.",
			action: () => onModeChange("hygiene"),
			icon: ShieldCheck,
		},
		{
			title: "Close session joins",
			detail:
				"Use the session ledger to tighten weak joins before cleanup or summarization.",
			action: () => onModeChange("sessions"),
			icon: Sparkles,
		},
		{
			title: "Triage hygiene",
			detail:
				"Only clean aggressively once the branch story is stable enough to survive replay.",
			action: () => onModeChange("hygiene"),
			icon: AlertTriangle,
		},
	] as const;

	const firstPassActions = sessionLane.slice(0, 3);

	return (
		<div className="dashboard-container flex h-full min-h-0 flex-col animate-in fade-in slide-in-from-bottom-1 motion-page-enter">
			<DashboardHeader
				repoName={stats.repo.name}
				repoPath={stats.repo.path}
				timeRange={timeRange}
				onTimeRangeChange={onTimeRangeChange}
				lastUpdated={lastUpdated}
				trustState={dashboardTrustState}
			/>

			<main className="flex-1 overflow-y-auto px-6 py-5" data-dashboard-content>
				<div className="mx-auto flex max-w-[100rem] flex-col gap-6">
					<section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
						<article className="rounded-[1.9rem] border border-border-light bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(9,12,18,0.98))] p-6 shadow-[0_40px_120px_-70px_rgba(15,23,42,0.86)]">
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center rounded-full border border-accent-blue-light bg-accent-blue/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent-blue">
									Narrative brief
								</span>
								<span className="inline-flex items-center rounded-full border border-border-light bg-bg-primary/75 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
									Start here
								</span>
								<span
									className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${trustIsHealthy ? "border-accent-green-light bg-accent-green-bg text-accent-green" : "border-accent-amber-light bg-accent-amber-bg text-accent-amber"}`}
								>
									{trustIsHealthy ? "Trust ready" : "Trust gate"}
								</span>
							</div>

							<h1 className="mt-5 max-w-4xl text-[2.35rem] font-semibold leading-[1.04] tracking-[-0.04em] text-text-primary md:text-[2.8rem]">
								Read this repo like an evidence brief, not a dashboard.
							</h1>
							<p className="mt-4 max-w-3xl text-[0.98rem] leading-7 text-text-secondary">
								You have{" "}
								<strong className="font-semibold text-accent-blue">
									{visibleFiles.length} files
								</strong>{" "}
								carrying the strongest signal in this window and{" "}
								<strong className="font-semibold text-accent-green">
									{stats.currentPeriod.period.commits} commits
								</strong>{" "}
								shaping the current story.{" "}
								{trustIsHealthy
									? "Capture is stable enough to move directly into repo evidence."
									: "Trust posture needs review before the branch story can be treated as stable."}
							</p>

							<div className="mt-5 grid gap-3 md:grid-cols-3">
								<div className="rounded-[1.2rem] border border-border-light bg-bg-primary/72 p-3.5">
									<div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										Focus file
									</div>
									<p className="mt-2 text-sm font-medium text-text-primary">
										{linkedFile?.filePath ?? "No ranked file yet"}
									</p>
									<p className="mt-1 text-sm leading-6 text-text-secondary">
										Walk from this file back into commits, sessions, and raw
										diff.
									</p>
								</div>
								<div className="rounded-[1.2rem] border border-border-light bg-bg-primary/72 p-3.5">
									<div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										Pressure
									</div>
									<p className="mt-2 text-sm font-medium text-text-primary">
										{narrativePressureLabel}
									</p>
									<p className="mt-1 text-sm leading-6 text-text-secondary">
										Use the next hop to see whether the story broadens or
										collapses.
									</p>
								</div>
								<div className="rounded-[1.2rem] border border-border-light bg-bg-primary/72 p-3.5">
									<div className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										Operator rule
									</div>
									<p className="mt-2 text-sm font-medium text-text-primary">
										Keep soft claims provisional.
									</p>
									<p className="mt-1 text-sm leading-6 text-text-secondary">
										If a conclusion cannot be walked back to evidence, hold it
										as interpretation rather than fact.
									</p>
								</div>
							</div>
						</article>

						<aside className="rounded-[1.8rem] border border-border-light bg-bg-subtle p-5 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.76)]">
							<div className="flex items-center justify-between gap-3">
								<div>
									<div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										First-pass actions
									</div>
									<h2 className="mt-2 text-lg font-semibold text-text-primary">
										Move from orientation into proof.
									</h2>
								</div>
								<Sparkles className="h-4 w-4 text-accent-violet" />
							</div>
							<p className="mt-3 text-sm leading-6 text-text-secondary">
								The opening view should make the next lane obvious before you
								scroll deeper into the workspace.
							</p>

							<div className="mt-4 grid gap-2.5">
								{firstPassActions.map((lane) => (
									<motion.button
										key={lane.title}
										type="button"
										onClick={lane.action}
										whileTap={
											shouldReduceMotion ? { opacity: 0.9 } : { scale: 0.985 }
										}
										className="group rounded-[1.15rem] border border-border-light bg-bg-primary/82 p-3.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent-blue-light hover:bg-bg-primary active:duration-75"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<lane.icon className="h-4 w-4 shrink-0 text-text-muted group-hover:text-accent-blue" />
													<p className="text-sm font-semibold text-text-primary">
														{lane.title}
													</p>
												</div>
												<p className="mt-2 text-sm leading-6 text-text-secondary">
													{lane.detail}
												</p>
											</div>
											<ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-text-muted transition group-hover:text-accent-blue" />
										</div>
									</motion.button>
								))}
							</div>

							<div className="mt-4 rounded-[1.15rem] border border-border-light bg-bg-primary/70 p-3.5">
								<div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
									<AlertTriangle className="h-3.5 w-3.5 text-accent-amber" />
									Pressure watch
								</div>
								<ul className="mt-3 grid gap-2 text-sm text-text-secondary">
									<li className="rounded-xl border border-border-subtle bg-bg-secondary/70 px-3 py-2.5">
										{narrativePressureLabel}
									</li>
									<li className="rounded-xl border border-border-subtle bg-bg-secondary/70 px-3 py-2.5">
										{trustIsHealthy
											? "Capture looks stable enough for direct evidence review."
											: "Trust posture is degraded, so interpretation should stay conservative."}
									</li>
									<li className="rounded-xl border border-border-subtle bg-bg-secondary/70 px-3 py-2.5">
										{nextFile
											? `Next evidence hop: ${nextFile.filePath}`
											: "The current top file still holds the strongest signal."}
									</li>
								</ul>
							</div>
						</aside>
					</section>

					<SignalStrip signals={briefSignals} />

					<section className="grid gap-4 xl:grid-cols-2">
						<article
							className="rounded-[1.6rem] border border-border-subtle bg-bg-subtle p-5 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.78)]"
							data-panel-status={panelStatusMap.metrics}
						>
							<div className="mb-6 flex items-center justify-between gap-3">
								<div>
									<div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										<Activity className="h-3.5 w-3.5 text-accent-blue" />
										Evidence pulse
									</div>
									<div className="mt-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
										Commit cadence
										<span className="font-normal text-text-muted">
											{activityData.length}d
										</span>
									</div>
								</div>
								<ChevronRight className="h-4 w-4 text-text-muted" />
							</div>
							<p className="mb-5 max-w-xl text-sm leading-6 text-text-secondary">
								Use the activity lane to see whether the current story is a
								sustained push or a short corrective burst.
							</p>
							<ActivityBarChart
								data={activityData}
								height={150}
								tone="blue"
								unit=" commits"
								label="Daily commit activity"
								showXLabels={false}
							/>
						</article>

						{toolChartData.length > 0 ? (
							<article className="rounded-[1.6rem] border border-border-subtle bg-bg-subtle p-5 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.78)]">
								<div className="mb-6 flex items-center justify-between gap-3">
									<div>
										<div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
											<PieChart className="h-3.5 w-3.5 text-accent-violet" />
											Tool evidence
										</div>
										<div className="mt-2 text-sm font-semibold text-text-primary">
											Which tool is shaping the window
										</div>
									</div>
									<ChevronRight className="h-4 w-4 text-text-muted" />
								</div>
								<p className="mb-5 max-w-xl text-sm leading-6 text-text-secondary">
									Tool mix should explain where authorship pressure is coming
									from, not just decorate the page with line counts.
								</p>
								<MiniBarChart
									data={toolChartData}
									height={150}
									unit=" lines"
									label="Tool line attribution"
								/>
							</article>
						) : (
							<article className="flex min-h-[18rem] items-center justify-center rounded-[1.6rem] border border-border-subtle bg-bg-subtle p-5 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.78)]">
								<p className="max-w-sm text-center text-sm leading-6 text-text-muted">
									No tool data is available in this window yet, so keep the
									branch story anchored to files and commits first.
								</p>
							</article>
						)}
					</section>

					<section className="grid gap-4 xl:grid-cols-[minmax(0,1.04fr)_minmax(18rem,0.96fr)]">
						<article className="rounded-[1.6rem] border border-border-subtle bg-bg-subtle p-5 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.78)]">
							<div className="mb-4 flex items-center justify-between gap-3">
								<div>
									<div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										<Sparkles className="h-3.5 w-3.5 text-accent-violet" />
										Operator lanes
									</div>
									<div className="mt-2 text-sm font-semibold text-text-primary">
										What to do next
									</div>
								</div>
								<ChevronRight className="h-4 w-4 text-text-muted" />
							</div>
							<div className="grid gap-2">
								{sessionLane.map((lane) => (
									<motion.button
										key={lane.title}
										type="button"
										onClick={lane.action}
										whileTap={
											shouldReduceMotion ? { opacity: 0.8 } : { scale: 0.985 }
										}
										className="group rounded-[1.15rem] border border-border-light bg-bg-primary/82 p-3.5 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-accent-blue-light hover:bg-bg-primary active:duration-75"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<lane.icon className="h-4 w-4 shrink-0 text-text-muted group-hover:text-accent-blue" />
													<div className="truncate text-sm font-medium text-text-primary">
														{lane.title}
													</div>
												</div>
												<p className="mt-2 text-sm leading-6 text-text-secondary">
													{lane.detail}
												</p>
											</div>
											<span className="shrink-0 rounded-full border border-border-light bg-bg-secondary/80 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-muted transition group-hover:border-accent-blue-light group-hover:text-accent-blue">
												Open
											</span>
										</div>
									</motion.button>
								))}
							</div>
						</article>

						<article className="rounded-[1.6rem] border border-border-subtle bg-bg-subtle p-5 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.78)]">
							<div className="mb-4 flex items-center justify-between gap-3">
								<div>
									<div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
										<AlertTriangle className="h-3.5 w-3.5 text-accent-amber" />
										Pressure watch
									</div>
									<div className="mt-2 text-sm font-semibold text-text-primary">
										What could mislead the story
									</div>
								</div>
								<ChevronRight className="h-4 w-4 text-text-muted" />
							</div>
							<div className="grid gap-2 text-sm">
								<div className="rounded-[1.05rem] border border-border-light bg-bg-primary/80 px-3.5 py-3 text-text-primary">
									<div className="flex items-center gap-2">
										<CircleDot className="h-4 w-4 shrink-0 text-accent-blue" />
										<span>{narrativePressureLabel}</span>
									</div>
								</div>
								<div className="rounded-[1.05rem] border border-border-light bg-bg-primary/80 px-3.5 py-3 text-text-primary">
									<div className="flex items-center gap-2">
										<ShieldCheck
											className={`h-4 w-4 shrink-0 ${trustIsHealthy ? "text-accent-green" : "text-accent-amber"}`}
										/>
										<span>
											{trustIsHealthy
												? "Capture posture is healthy enough for direct evidence review."
												: "Trust is degraded, so any narrative needs extra corroboration."}
										</span>
									</div>
								</div>
								<div className="rounded-[1.05rem] border border-border-light bg-bg-primary/80 px-3.5 py-3 text-text-primary">
									<div className="flex items-center gap-2">
										<FileCode2 className="h-4 w-4 shrink-0 text-accent-violet" />
										<span>
											{nextFile
												? `Next evidence hop: ${nextFile.filePath}`
												: "There is no second-ranked evidence hop yet."}
										</span>
									</div>
								</div>
							</div>
						</article>
					</section>

					<div
						className="space-y-3"
						data-panel-status={panelStatusMap.topFiles}
					>
						<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
							<div>
								<div className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
									Evidence-ranked files
								</div>
								<h2 className="mt-1 text-lg font-semibold text-text-primary">
									Open the files most likely to collapse or confirm the story.
								</h2>
							</div>
							<p className="max-w-xl text-sm leading-6 text-text-secondary">
								Ranked files should help you move from narrative summary into
								concrete code without guessing where the evidence lives.
							</p>
						</div>
						<TopFilesTable
							files={visibleFiles}
							hasMore={!hasActiveQuery && stats.topFiles.hasMore}
							isLoading={loadingMore}
							onFileClick={onFileClick}
							onLoadMore={onLoadMore}
						/>
					</div>
				</div>
			</main>

			<BottomStats
				repoCount={1}
				sessionCount={stats.currentPeriod.period.commits}
				aiPercentage={aiPct}
			/>
		</div>
	);
}
