import { motion, useReducedMotion } from "framer-motion";
import { type ComponentProps, useEffect, useId, useState } from "react";
import type { CaptureReliabilityStatus } from "../../core/tauri/ingestConfig";
import type {
	BranchHeaderViewModel,
	BranchViewModel,
	FileChange,
	Mode,
} from "../../core/types";
import { BranchHeader } from "../components/BranchHeader";
import { BranchNarrativePanel } from "../components/BranchNarrativePanel";
import { Breadcrumb } from "../components/Breadcrumb";
import { CaptureActivityStrip } from "../components/CaptureActivityStrip";
import { DecisionArchaeologyPanel } from "../components/DecisionArchaeologyPanel";
import { FilesChanged } from "../components/FilesChanged";
import { ImportErrorBanner } from "../components/ImportErrorBanner";
import { IngestToast } from "../components/IngestToast";
import { IntentList } from "../components/IntentList";
import { NarrativeGovernancePanel } from "../components/NarrativeGovernancePanel";
import { NeedsAttentionList } from "../components/NeedsAttentionList";
import { RightPanelTabs } from "../components/RightPanelTabs";
import { SkeletonFiles } from "../components/Skeleton";
import { Timeline } from "../components/Timeline";
import { PANEL } from "./branchView.constants";
import { RepoEvidenceOverview } from "./RepoEvidenceOverview";

interface BranchViewLayoutProps {
	isExitingFilteredView?: boolean;
	ingestToast?: { id: string; message: string } | null;
	stage: number;
	model: BranchViewModel;
	headerViewModel: BranchHeaderViewModel;
	onClearFilter?: () => void;
	onInspectEvidenceCta?: () => void;
	onHeaderOpenRawDiff?: () => void;
	narrativePanelProps: ComponentProps<typeof BranchNarrativePanel>;
	governanceProps: ComponentProps<typeof NarrativeGovernancePanel>;
	archaeologyProps: ComponentProps<typeof DecisionArchaeologyPanel>;
	captureActivityProps?: ComponentProps<typeof CaptureActivityStrip> | null;
	ingestIssuesProps?: ComponentProps<typeof NeedsAttentionList> | null;
	selectedNode: BranchViewModel["timeline"][number] | null;
	loadingFiles: boolean;
	files: FileChange[];
	selectedNodeId: string | null;
	actionError?: string | null;
	onDismissActionError?: () => void;
	rightPanelProps: ComponentProps<typeof RightPanelTabs>;
	timelineProps: ComponentProps<typeof Timeline>;
	captureReliabilityStatus?: CaptureReliabilityStatus | null;
	onModeChange?: (mode: Mode) => void;
}

export function BranchViewLayout({
	isExitingFilteredView,
	ingestToast,
	stage,
	model,
	headerViewModel,
	onClearFilter,
	onInspectEvidenceCta,
	onHeaderOpenRawDiff,
	narrativePanelProps,
	governanceProps,
	archaeologyProps,
	captureActivityProps,
	ingestIssuesProps,
	selectedNode,
	loadingFiles,
	files,
	selectedNodeId,
	actionError,
	onDismissActionError,
	rightPanelProps,
	timelineProps,
	captureReliabilityStatus,
	onModeChange,
}: BranchViewLayoutProps) {
	const shouldReduceMotion = useReducedMotion();
	const initialY = shouldReduceMotion ? 0 : PANEL.initialY;
	const finalY = shouldReduceMotion ? 0 : PANEL.finalY;
	const commitCount = model.timeline.filter(
		(node) => node.type === "commit",
	).length;
	const workspaceHeadline =
		model.narrative?.summary ||
		model.title ||
		(commitCount === 1 ? "1 commit" : `${commitCount} commits`) +
			(model.stats.files ? ` across ${model.stats.files} files` : "");
	const layoutScopeKey = `${model.meta?.repoPath ?? ""}:${model.meta?.branchName ?? ""}`;
	const workspaceDetailId = useId();
	const [workspaceDetailOpen, setWorkspaceDetailOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on scope key change
	useEffect(() => {
		setWorkspaceDetailOpen(false);
	}, [layoutScopeKey]);

	const handleInspectEvidence = () => {
		onInspectEvidenceCta?.();
		document.getElementById("verification-rail")?.scrollIntoView({
			behavior: shouldReduceMotion ? "auto" : "smooth",
			block: "start",
		});
	};

	return (
		<div
			className={`flex h-full flex-col motion-page-enter ${isExitingFilteredView ? "animate-out fade-out slide-out-to-top-2 motion-page-exit fill-mode-forwards" : ""}`}
		>
			<IngestToast toast={ingestToast ?? null} />
			<div className="flex-1 overflow-hidden bg-bg-secondary">
				<div className="flex h-full flex-col overflow-y-auto bg-bg-tertiary">
					<div className="mx-auto flex w-full max-w-[100rem] flex-col gap-5 p-4 sm:p-6 lg:flex-1 lg:overflow-hidden lg:p-8">
						<RepoEvidenceOverview
							model={model}
							captureReliabilityStatus={captureReliabilityStatus}
							onModeChange={onModeChange}
						/>

						<div
							id="branch-workspace"
							className="flex flex-col gap-5 xl:grid xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] xl:overflow-hidden"
						>
							<motion.div
								layout
								layoutId="branch-header"
								className="xl:col-span-2"
								initial={{ opacity: 0, y: initialY }}
								animate={{
									opacity: stage >= 1 ? 1 : 0,
									y: stage >= 1 ? finalY : initialY,
								}}
								transition={PANEL.spring}
							>
								<BranchHeader
									viewModel={headerViewModel}
									workspaceStrip={{
										headline: workspaceHeadline,
										commitCount,
										fileCount: model.stats.files,
										confidencePercent: model.narrative
											? Math.round(model.narrative.confidence * 100)
											: null,
									}}
									onClearFilter={onClearFilter}
									onInspectEvidence={handleInspectEvidence}
									onOpenRawDiff={
										onHeaderOpenRawDiff ?? narrativePanelProps.onOpenRawDiff
									}
								/>
							</motion.div>

							<div className="flex flex-col gap-5 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
								<motion.div
									initial={{ opacity: 0, y: initialY }}
									animate={{
										opacity: stage >= 2 ? 1 : 0,
										y: stage >= 2 ? finalY : initialY,
									}}
									transition={PANEL.spring}
								>
									<BranchNarrativePanel {...narrativePanelProps} />
								</motion.div>

								<motion.section
									className="group rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3"
									initial={{ opacity: 0, y: initialY }}
									animate={{
										opacity: stage >= 3 ? 1 : 0,
										y: stage >= 3 ? finalY : initialY,
									}}
									transition={PANEL.spring}
									aria-labelledby={`${workspaceDetailId}-toggle`}
								>
									<button
										id={`${workspaceDetailId}-toggle`}
										type="button"
										aria-expanded={workspaceDetailOpen}
										aria-controls={workspaceDetailId}
										onClick={() =>
											setWorkspaceDetailOpen((current) => !current)
										}
										className="flex w-full items-center gap-2 py-1 text-left text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
									>
										<span className="flex h-4 w-4 items-center justify-center rounded-sm bg-bg-primary transition-colors motion-reduce:transition-none">
											<svg
												className={`h-3 w-3 transition-transform motion-reduce:transition-none ${workspaceDetailOpen ? "rotate-90" : ""}`}
												viewBox="0 0 16 16"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
											>
												<title>Toggle details panel</title>
												<path
													d="M6 12L10 8L6 4"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</span>
										Advanced workspace detail
									</button>
									{/* biome-ignore lint/a11y/useSemanticElements: collapsible region panel, not a standalone landmark */}
									<div
										id={workspaceDetailId}
										role="region"
										aria-labelledby={`${workspaceDetailId}-toggle`}
										className={`${workspaceDetailOpen ? "flex" : "hidden"} flex-col gap-5 pt-4`}
									>
										<NarrativeGovernancePanel {...governanceProps} />
										<DecisionArchaeologyPanel {...archaeologyProps} />
										{captureActivityProps ? (
											<CaptureActivityStrip {...captureActivityProps} />
										) : null}
									</div>
								</motion.section>

								{ingestIssuesProps ? (
									<NeedsAttentionList {...ingestIssuesProps} />
								) : null}

								<motion.div
									initial={{ opacity: 0, y: initialY }}
									animate={{
										opacity: stage >= 4 ? 1 : 0,
										y: stage >= 4 ? finalY : initialY,
									}}
									transition={PANEL.spring}
								>
									<IntentList items={model.intent} />
								</motion.div>

								{/* Breadcrumb navigation */}
								{selectedNode && (
									<div className="flex items-center gap-2 px-1">
										<Breadcrumb
											segments={[
												{
													label: model.meta?.branchName || "main",
													icon: "branch",
												},
												{
													label:
														selectedNode.label || selectedNode.id.slice(0, 8),
													icon: "commit",
												},
											]}
										/>
									</div>
								)}

								<motion.div
									initial={{ opacity: 0, y: initialY }}
									animate={{
										opacity: stage >= 5 ? 1 : 0,
										y: stage >= 5 ? finalY : initialY,
									}}
									transition={PANEL.spring}
								>
									{loadingFiles ? (
										<div className="card p-5">
											<div className="section-header">Files changed</div>
											<div className="section-subheader mt-0.5">loading…</div>
											<div className="mt-4">
												<SkeletonFiles count={5} />
											</div>
										</div>
									) : (
										<FilesChanged
											files={files}
											title="Files changed"
											traceByFile={
												selectedNodeId
													? model.traceSummaries?.byFileByCommit[selectedNodeId]
													: undefined
											}
										/>
									)}
								</motion.div>

								{actionError && (
									<ImportErrorBanner
										error={actionError}
										onDismiss={onDismissActionError}
									/>
								)}
							</div>

							<motion.div
								className="flex min-w-0 flex-col xl:overflow-hidden"
								initial={{ opacity: 0, y: initialY }}
								animate={{
									opacity: stage >= 6 ? 1 : 0,
									y: stage >= 6 ? finalY : initialY,
								}}
								transition={PANEL.spring}
							>
								<RightPanelTabs {...rightPanelProps} />
							</motion.div>
						</div>
					</div>
				</div>
			</div>

			<motion.div
				layout
				layoutId="timeline-view"
				initial={{ opacity: 0, y: initialY }}
				animate={{
					opacity: stage >= 7 ? 1 : 0,
					y: stage >= 7 ? finalY : initialY,
				}}
				transition={PANEL.spring}
			>
				<Timeline {...timelineProps} />
			</motion.div>
		</div>
	);
}
