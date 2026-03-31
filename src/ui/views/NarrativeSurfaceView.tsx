import type { CaptureReliabilityStatus } from "../../core/tauri/ingestConfig";
import type { Mode } from "../../core/types";
import type { RepoState } from "../../hooks/useRepoLoader";
import { DashboardTrustBadge } from "../components/dashboard/DashboardTrustBadge";
import { LedeBanner } from "../components/LedeBanner";
import { SectionHeader } from "../components/SectionHeader";
import {
	buildNarrativeSurfaceViewModel,
	type SurfaceMode,
	type SurfaceTableRow,
} from "./narrativeSurfaceData";
import { ProvenanceSection } from "./narrativeSurfaceProvenance";
import {
	ActivitySection,
	CompactKpiStrip,
	HighlightsSection,
	SummaryTable,
} from "./narrativeSurfaceSections";
import { SessionsView } from "./SessionsView";
import { SettingsView } from "./SettingsView";
import { ToolsView } from "./ToolsView";

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

interface NarrativeSurfaceViewProps {
	mode: SurfaceMode;
	repoState: RepoState;
	captureReliabilityStatus?: CaptureReliabilityStatus | null;
	autoIngestEnabled?: boolean;
	onModeChange: (mode: Mode) => void;
	onOpenRepo: () => void;
	onImportSession?: () => void;
	repoRoot: string;
	onAction?: (action: NonNullable<SurfaceTableRow["action"]>) => void;
}

export function NarrativeSurfaceView({
	mode,
	repoState,
	captureReliabilityStatus,
	autoIngestEnabled,
	onModeChange,
	onOpenRepo,
	onImportSession,
	repoRoot,
	onAction,
}: NarrativeSurfaceViewProps) {
	if (mode === "sessions") {
		return (
			<SessionsView
				repoState={repoState}
				captureReliabilityStatus={captureReliabilityStatus}
				autoIngestEnabled={autoIngestEnabled}
				onModeChange={onModeChange}
				onOpenRepo={onOpenRepo}
				onImportSession={onImportSession}
				onAction={onAction}
			/>
		);
	}

	if (mode === "settings") {
		return (
			<SettingsView
				onModeChange={onModeChange}
				onOpenRepo={onOpenRepo}
				onImportSession={onImportSession}
				repoRoot={repoRoot}
			/>
		);
	}

	if (mode === "tools") {
		return (
			<ToolsView
				repoState={repoState}
				captureReliabilityStatus={captureReliabilityStatus}
				autoIngestEnabled={autoIngestEnabled}
				onModeChange={onModeChange}
				onOpenRepo={onOpenRepo}
				onImportSession={onImportSession}
				onAction={onAction}
			/>
		);
	}

	const viewModel = buildNarrativeSurfaceViewModel(
		mode,
		repoState,
		captureReliabilityStatus,
		autoIngestEnabled,
	);
	const _repoPath =
		repoState.status === "ready"
			? repoState.repo.root
			: repoState.status !== "idle"
				? (repoState.path ?? "~/dev/trace-narrative")
				: "~/dev/trace-narrative";

	return (
		<div className="flex h-full min-h-0 flex-col bg-bg-primary">
			<main className="flex-1 overflow-y-auto px-6 py-6">
				<div className="mx-auto flex max-w-6xl flex-col gap-6">
					<SectionHeader
						title={viewModel.title}
						description={viewModel.subtitle}
						badge={<DashboardTrustBadge trustState={viewModel.trustState} />}
					/>

					<LedeBanner
						mode={mode}
						authorityTier={viewModel.heroAuthorityTier}
						authorityLabel={viewModel.heroAuthorityLabel}
						heroTitle={viewModel.heroTitle}
						heroBody={viewModel.heroBody}
						onJump={() => onModeChange("repo")}
					/>
					<CompactKpiStrip metrics={viewModel.metrics} />

					{viewModel.provenance && (
						<ProvenanceSection
							provenance={viewModel.provenance}
							onAction={onAction}
						/>
					)}

					<section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
						<HighlightsSection
							title={viewModel.highlightsTitle}
							highlights={viewModel.highlights}
							onAction={onAction}
						/>
						<ActivitySection
							title={viewModel.activityTitle}
							activity={viewModel.activity}
							onAction={onAction}
						/>
					</section>

					<SummaryTable
						title={viewModel.tableTitle}
						columns={viewModel.tableColumns}
						rows={viewModel.tableRows}
						onAction={onAction}
					/>

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
