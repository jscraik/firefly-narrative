import {
	ArrowLeft,
	ArrowRight,
	FileText,
	GitCommit,
	MessageSquare,
} from "lucide-react";
import type React from "react";
import type { BranchHeaderViewModel, HeaderMetric } from "../../core/types";

function formatMetric(metric: HeaderMetric): string {
	if (metric.kind === "known") return String(metric.value);
	return "—";
}

function Stat({
	metric,
	label,
	tone,
	icon: Icon,
	prefix,
}: {
	metric: HeaderMetric;
	label: string;
	tone?: "neutral" | "good" | "bad";
	icon?: React.ElementType;
	prefix?: "+" | "-";
}) {
	const valueClass =
		tone === "good"
			? "text-accent-green"
			: tone === "bad"
				? "text-accent-red"
				: "text-text-secondary";

	const value = formatMetric(metric);
	const displayValue =
		metric.kind === "known" && prefix ? `${prefix}${value}` : value;
	const title =
		metric.kind === "unavailable"
			? `Unavailable (${metric.reason})`
			: undefined;

	return (
		<div className="flex items-center gap-2">
			{Icon && <Icon className="w-3.5 h-3.5 text-text-muted" />}
			<div className="flex items-baseline gap-1.5" title={title}>
				<span className={`text-base font-semibold tabular-nums ${valueClass}`}>
					{displayValue}
				</span>
				<span className="text-[0.6875rem] text-text-muted">{label}</span>
			</div>
		</div>
	);
}

function StatGroup({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<div className="rounded-[1.1rem] border border-border-light bg-bg-primary/72 p-3.5">
			<span className="text-[0.625rem] font-semibold text-text-muted uppercase tracking-[0.16em]">
				{label}
			</span>
			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
				{children}
			</div>
		</div>
	);
}

export function BranchHeader({
	viewModel,
	workspaceStrip,
	onClearFilter,
	onInspectEvidence,
	onOpenRawDiff,
}: {
	viewModel: BranchHeaderViewModel;
	workspaceStrip?: {
		headline: string;
		commitCount: number;
		fileCount: number;
		confidencePercent?: number | null;
	};
	onClearFilter?: () => void;
	onInspectEvidence?: () => void;
	onOpenRawDiff?: () => void;
}) {
	if (viewModel.kind === "hidden") {
		return null;
	}

	if (viewModel.kind === "shell") {
		return (
			<section
				className="card p-5"
				aria-label="Repo evidence context"
				aria-live="polite"
			>
				<h2 className="text-sm font-semibold text-text-primary">
					{viewModel.state === "loading"
						? "Loading repo evidence"
						: "Repo evidence unavailable"}
				</h2>
				<p className="mt-2 text-sm text-text-tertiary">{viewModel.message}</p>
			</section>
		);
	}

	return (
		<section
			className="rounded-[1.6rem] border border-border-light bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(11,16,28,0.98))] p-5 shadow-[0_30px_100px_-52px_rgba(15,23,42,0.82)]"
			aria-label="Repo evidence context"
			aria-live="polite"
		>
			{workspaceStrip ? (
				<div className="rounded-[1.3rem] border border-border-light bg-bg-primary/70 px-4 py-3 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.7)]">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center rounded-full border border-accent-blue-light bg-accent-blue/10 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-accent-blue">
									Workspace strip
								</span>
								<span className="inline-flex items-center rounded-full border border-border-light bg-bg-secondary/80 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
									Repo evidence
								</span>
							</div>
							<p className="mt-2 truncate text-sm font-medium text-text-primary">
								{workspaceStrip.headline}
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-text-muted">
							<span className="inline-flex items-center gap-1 rounded-full border border-accent-amber-light bg-accent-amber-bg px-2.5 py-1 text-accent-amber">
								{workspaceStrip.commitCount} commits
							</span>
							<span className="inline-flex items-center gap-1 rounded-full border border-border-light bg-bg-secondary/80 px-2.5 py-1 text-text-secondary">
								{workspaceStrip.fileCount} files
							</span>
							{workspaceStrip.confidencePercent != null ? (
								<span className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-bg-secondary/80 px-2.5 py-1 text-text-secondary">
									<span
										className={`h-1.5 w-1.5 rounded-full ${workspaceStrip.confidencePercent > 80 ? "bg-accent-green" : "bg-accent-amber"}`}
									/>
									Confidence {workspaceStrip.confidencePercent}%
								</span>
							) : null}
						</div>
					</div>
				</div>
			) : null}

			<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					{viewModel.isFilteredView && onClearFilter && (
						<button
							type="button"
							onClick={onClearFilter}
							className="inline-flex items-center gap-1.5 rounded-full border border-border-light bg-bg-primary/75 px-3 py-1.5 text-sm text-text-secondary transition duration-200 ease-out hover:border-border-light hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary active:duration-75 active:scale-[0.98]"
						>
							<ArrowLeft className="w-4 h-4" aria-hidden="true" />
							<span>Back to narrative brief</span>
						</button>
					)}
					<span className="inline-flex items-center rounded-full border border-border-light bg-bg-primary/75 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-text-muted">
						Workspace thesis
					</span>
					<span className="badge-open">{viewModel.status}</span>
					{viewModel.isFilteredView && (
						<span className="inline-flex items-center rounded-full border border-accent-blue-light bg-accent-blue-bg px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-accent-blue">
							Focused evidence slice
						</span>
					)}
				</div>
			</div>

			<div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(20rem,0.72fr)] xl:items-start">
				<div className="min-w-0">
					<h1 className="max-w-4xl text-[1.95rem] font-semibold leading-[1.08] tracking-[-0.03em] text-text-primary md:text-[2.35rem]">
						{viewModel.title}
					</h1>
					<p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary md:text-[0.95rem]">
						{viewModel.description}
					</p>
				</div>

				<div className="rounded-[1.35rem] border border-border-light bg-bg-primary/70 p-4">
					<div className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
						First-pass actions
					</div>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						Start with the strongest available evidence, then drop to raw diff
						when the interpretation feels too soft.
					</p>
					{/* biome-ignore lint/a11y/useSemanticElements: button group container, fieldset would change layout */}
					<div
						className="mt-4 flex flex-col gap-2"
						role="group"
						aria-label="First-pass actions"
					>
						<button
							type="button"
							onClick={onInspectEvidence}
							className="inline-flex items-center justify-between rounded-xl border border-accent-blue-light bg-accent-blue/12 px-3.5 py-2.5 text-sm font-medium text-accent-blue transition duration-200 ease-out hover:bg-accent-blue/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:duration-75 active:scale-[0.99]"
						>
							<span>Inspect evidence</span>
							<ArrowRight className="h-4 w-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={onOpenRawDiff}
							className="inline-flex items-center justify-between rounded-xl border border-border-light bg-bg-secondary/85 px-3.5 py-2.5 text-sm font-medium text-text-secondary transition duration-200 ease-out hover:border-border-light hover:bg-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary active:duration-75 active:scale-[0.99]"
						>
							<span>Open raw diff</span>
							<ArrowRight className="h-4 w-4" aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>

			<div className="mt-5 grid gap-3 border-t border-border-subtle pt-4 sm:grid-cols-2 xl:grid-cols-3">
				<StatGroup label="Code">
					<Stat
						metric={viewModel.metrics.added}
						label="added"
						tone="good"
						prefix="+"
					/>
					<Stat
						metric={viewModel.metrics.removed}
						label="removed"
						tone="bad"
						prefix="-"
					/>
					<Stat
						metric={viewModel.metrics.files}
						label="files"
						icon={FileText}
					/>
				</StatGroup>

				<StatGroup label="Git">
					<Stat
						metric={viewModel.metrics.commits}
						label="commits"
						icon={GitCommit}
					/>
				</StatGroup>

				<StatGroup label="Codex">
					<Stat
						metric={viewModel.metrics.prompts}
						label="prompts"
						icon={MessageSquare}
					/>
					<Stat metric={viewModel.metrics.responses} label="responses" />
				</StatGroup>
			</div>
		</section>
	);
}
