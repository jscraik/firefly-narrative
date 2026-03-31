import { useEffect, useState } from "react";
import type {
	CaptureReliabilityStatus,
	CodexAppServerStatus,
} from "../../core/tauri/ingestConfig";
import type {
	AskWhyCitation,
	AskWhyState,
	BranchNarrative,
	NarrativeDetailLevel,
	NarrativeEvidenceLink,
	NarrativeFeedbackAction,
	NarrativeFeedbackActorRole,
	NarrativeRecallLaneItem,
	StakeholderAudience,
	StakeholderProjection,
	StakeholderProjections,
} from "../../core/types";
import {
	DetailButton,
	DiffSection,
	EvidenceSection,
	SummarySection,
} from "./BranchNarrativePanelSections";
import { type TrustState, TrustStateIndicator } from "./TrustStateIndicator";

type RecallLaneEvidenceContext = {
	source?: "recall_lane";
	recallLaneItemId?: string;
	recallLaneConfidenceBand?: import("../../core/types").NarrativeConfidenceTier;
};

type OpenEvidenceHandler = (
	link: NarrativeEvidenceLink,
	context?: RecallLaneEvidenceContext,
) => void;

type BranchNarrativePanelProps = {
	narrative: BranchNarrative;
	projections: StakeholderProjections;
	audience: StakeholderAudience;
	detailLevel: NarrativeDetailLevel;
	feedbackActorRole: NarrativeFeedbackActorRole;
	killSwitchActive?: boolean;
	killSwitchReason?: string;
	branchScopeKey?: string;
	recallLaneItems?: NarrativeRecallLaneItem[];
	askWhyState: AskWhyState;
	// Phase 4: Trust-state UX
	trustState?: TrustState;
	activeThreadId?: string | null;
	captureReliabilityStatus?: CaptureReliabilityStatus | null;
	codexAppServerStatus?: CodexAppServerStatus | null;
	onRetryHydrate?: () => void;
	onClearStaleState?: () => void;
	// Existing handlers
	onAudienceChange: (audience: StakeholderAudience) => void;
	onFeedbackActorRoleChange: (role: NarrativeFeedbackActorRole) => void;
	onDetailLevelChange: (level: NarrativeDetailLevel) => void;
	onSubmitFeedback: (feedback: NarrativeFeedbackAction) => void;
	onOpenEvidence: OpenEvidenceHandler;
	onOpenRawDiff: (laneContext?: RecallLaneEvidenceContext) => void;
	onSubmitAskWhy: (question: string) => void;
	onOpenAskWhyCitation: (citation: AskWhyCitation) => void;
	onAdvancedAnalysisToggle?: (open: boolean) => void;
	onAdvancedControlUsed?: (control: string) => void;
};

function projectionFallback(
	audience: StakeholderAudience,
	narrative: BranchNarrative,
): StakeholderProjection {
	return {
		audience,
		headline: "Narrative projection pending.",
		bullets: [narrative.summary],
		risks: [],
		evidenceLinks: narrative.evidenceLinks,
	};
}

export function BranchNarrativePanel(props: BranchNarrativePanelProps) {
	const {
		narrative,
		projections,
		audience,
		detailLevel,
		feedbackActorRole,
		killSwitchActive = false,
		killSwitchReason,
		branchScopeKey,
		recallLaneItems = [],
		askWhyState,
		onDetailLevelChange,
		// Phase 4: Trust-state props
		trustState = "none",
		activeThreadId = null,
		captureReliabilityStatus = null,
		codexAppServerStatus = null,
		onRetryHydrate,
		onClearStaleState,
		onAudienceChange,
		onFeedbackActorRoleChange,
		onSubmitFeedback,
		onOpenEvidence,
		onOpenRawDiff,
		onSubmitAskWhy,
		onOpenAskWhyCitation,
		onAdvancedAnalysisToggle,
		onAdvancedControlUsed,
	} = props;
	const projection =
		projections[audience] ?? projectionFallback(audience, narrative);
	const effectiveDetailLevel: NarrativeDetailLevel = killSwitchActive
		? "diff"
		: detailLevel;
	const [advancedAnalysisOpen, setAdvancedAnalysisOpen] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on scope key change
	useEffect(() => {
		setAdvancedAnalysisOpen(false);
	}, [branchScopeKey]);

	// Phase 4: Derive approval actionability from trust state
	// Phase 4: Derive approval actionability from trust state
	// 'none' is included for backwards compatibility when trust system is not active
	const _approvalsActionable =
		trustState === "none" ||
		trustState === "live_trusted" ||
		trustState === "replaying";
	const _approvalsDisabledReason =
		trustState === "hydrating"
			? "Hydrating baseline"
			: trustState === "trust_paused"
				? "Trust paused - resolve issues first"
				: null;

	return (
		<div className="rounded-[1.6rem] border border-border-light bg-[linear-gradient(135deg,rgba(18,25,39,0.98),rgba(12,18,30,0.98))] p-5 shadow-[0_28px_90px_-52px_rgba(15,23,42,0.82)]">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
						Story rail
					</div>
					<div className="mt-1 text-xl font-semibold tracking-[-0.02em] text-text-primary">
						Branch story
					</div>
					<div className="mt-1.5 text-sm leading-6 text-text-secondary">
						Inferred from commits, linked sessions, and trace-backed evidence.
					</div>
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: button group container, fieldset would change layout */}
				<div
					className="flex flex-wrap items-center gap-1 rounded-[1rem] border border-border-light bg-bg-primary/75 p-1"
					role="group"
					aria-label="Story detail level"
				>
					<DetailButton
						level="summary"
						current={effectiveDetailLevel}
						label="Summary"
						disabled={killSwitchActive}
						onClick={onDetailLevelChange}
					/>
					<DetailButton
						level="evidence"
						current={effectiveDetailLevel}
						label="Evidence"
						disabled={killSwitchActive}
						onClick={onDetailLevelChange}
					/>
					<DetailButton
						level="diff"
						current={effectiveDetailLevel}
						label="Raw Diff"
						onClick={onDetailLevelChange}
					/>
				</div>
			</div>

			{/* Phase 4: Render TrustStateIndicator when trust is not 'none' */}
			{trustState !== "none" && (
				<div className="mt-3">
					<TrustStateIndicator
						trustState={trustState}
						activeThreadId={activeThreadId ?? null}
						captureReliabilityStatus={captureReliabilityStatus}
						codexAppServerStatus={codexAppServerStatus}
						onRetryHydrate={onRetryHydrate}
						onClearStaleState={onClearStaleState}
					/>
				</div>
			)}

			{killSwitchActive && (
				<div className="mt-4 rounded-xl border border-accent-red-light bg-accent-red-bg px-3 py-2.5 text-xs text-accent-red">
					Kill switch active. Narrative layers are read-only until quality
					recovers.{" "}
					<span className="text-text-secondary">
						{killSwitchReason ?? "Fallback to raw diff is enforced."}
					</span>
				</div>
			)}

			{effectiveDetailLevel === "summary" && (
				<SummarySection
					narrative={narrative}
					projection={projection}
					audience={audience}
					detailLevel={detailLevel}
					feedbackActorRole={feedbackActorRole}
					killSwitchActive={killSwitchActive}
					recallLaneItems={recallLaneItems}
					askWhyState={askWhyState}
					advancedAnalysisOpen={advancedAnalysisOpen}
					onAdvancedAnalysisOpenChange={(open) => {
						setAdvancedAnalysisOpen(open);
						onAdvancedAnalysisToggle?.(open);
					}}
					onAudienceChange={onAudienceChange}
					onFeedbackActorRoleChange={onFeedbackActorRoleChange}
					onSubmitFeedback={onSubmitFeedback}
					onOpenEvidence={onOpenEvidence}
					onOpenRawDiff={onOpenRawDiff}
					onSubmitAskWhy={onSubmitAskWhy}
					onOpenAskWhyCitation={onOpenAskWhyCitation}
					onAdvancedControlUsed={onAdvancedControlUsed}
				/>
			)}

			{effectiveDetailLevel === "evidence" && (
				<EvidenceSection
					evidenceLinks={narrative.evidenceLinks}
					onOpenEvidence={onOpenEvidence}
				/>
			)}

			{effectiveDetailLevel === "diff" && (
				<DiffSection onOpenRawDiff={() => onOpenRawDiff()} />
			)}
		</div>
	);
}
