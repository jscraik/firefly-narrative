import { type ReactNode, useId } from "react";
import type {
	AskWhyCitation,
	AskWhyState,
	BranchNarrative,
	NarrativeConfidenceTier,
	NarrativeDetailLevel,
	NarrativeEvidenceLink,
	NarrativeFeedbackAction,
	NarrativeFeedbackActorRole,
	NarrativeRecallLaneItem,
	StakeholderAudience,
	StakeholderProjection,
} from "../../core/types";
import { AskWhyAnswerCard } from "./AskWhyAnswerCard";

type RecallLaneEvidenceContext = {
	source?: "recall_lane";
	recallLaneItemId?: string;
	recallLaneConfidenceBand?: NarrativeConfidenceTier;
};

type OpenEvidenceHandler = (
	link: NarrativeEvidenceLink,
	context?: RecallLaneEvidenceContext,
) => void;

function confidenceTierStyle(
	tier: NarrativeRecallLaneItem["confidenceTier"],
): string {
	if (tier === "high") return "text-accent-green";
	if (tier === "medium") return "text-accent-amber";
	return "text-text-muted";
}

function SectionCard({
	eyebrow,
	title,
	children,
	variant = "default",
}: {
	eyebrow: string;
	title: string;
	children: ReactNode;
	variant?: "default" | "hero" | "diff";
}) {
	const cardClass =
		variant === "hero"
			? "rounded-[1.45rem] border border-border-light bg-[linear-gradient(135deg,rgba(21,29,45,0.96),rgba(14,19,31,0.98))] p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.84)]"
			: variant === "diff"
				? "rounded-[1.35rem] border border-accent-amber-light bg-[linear-gradient(135deg,rgba(55,38,18,0.24),rgba(20,18,18,0.98))] p-4"
				: "rounded-[1.35rem] border border-border-light bg-bg-primary/78 p-4";
	const titleClass =
		variant === "hero"
			? "mt-1 text-[1.2rem] font-semibold tracking-[-0.02em] text-text-primary"
			: "mt-1 text-sm font-semibold text-text-primary";

	return (
		<section className={cardClass}>
			<div className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
				{eyebrow}
			</div>
			<h3 className={titleClass}>{title}</h3>
			<div className="mt-3">{children}</div>
		</section>
	);
}

function deriveWhySignals(
	narrative: BranchNarrative,
	projection: StakeholderProjection,
	recallLaneItems: NarrativeRecallLaneItem[],
): string[] {
	const signals: string[] = [];
	const projectionBullets = projection.bullets.filter(Boolean).slice(0, 2);
	signals.push(...projectionBullets);
	signals.push(
		narrative.evidenceLinks.length > 0
			? `${narrative.evidenceLinks.length} linked evidence item${narrative.evidenceLinks.length === 1 ? "" : "s"} are already attached to this branch summary.`
			: "No linked evidence is attached yet, so the branch should be verified through the raw diff and the evidence rail.",
	);
	signals.push(
		recallLaneItems.length > 0
			? `${recallLaneItems.length} ranked causal step${recallLaneItems.length === 1 ? "" : "s"} are available below to explain the sequence.`
			: "No ranked causal steps are available yet, so chronology and evidence should stay provisional.",
	);
	return signals.slice(0, 3);
}

type SequenceStep = {
	id: string;
	title: string;
	body: string;
	actionLabel: string;
	onOpen: () => void;
	confidenceLabel?: string;
};

export function DetailButton(props: {
	level: NarrativeDetailLevel;
	current: NarrativeDetailLevel;
	label: string;
	disabled?: boolean;
	onClick: (level: NarrativeDetailLevel) => void;
}) {
	const { level, current, label, disabled = false, onClick } = props;
	const active = current === level;

	return (
		<button
			type="button"
			onClick={() => onClick(level)}
			disabled={disabled}
			className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
				active
					? "border-accent-blue-light bg-accent-blue-bg text-accent-blue shadow-[0_10px_30px_-22px_rgba(96,165,250,0.9)]"
					: "border-transparent bg-transparent text-text-secondary hover:border-border-light hover:bg-bg-secondary"
			} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
			aria-pressed={active}
		>
			{label}
		</button>
	);
}

export function SummarySection({
	narrative,
	projection,
	audience,
	detailLevel,
	feedbackActorRole,
	killSwitchActive,
	recallLaneItems,
	askWhyState,
	advancedAnalysisOpen,
	onAdvancedAnalysisOpenChange,
	onAudienceChange,
	onFeedbackActorRoleChange,
	onSubmitFeedback,
	onOpenEvidence,
	onOpenRawDiff,
	onSubmitAskWhy,
	onOpenAskWhyCitation,
	onAdvancedControlUsed,
}: {
	narrative: BranchNarrative;
	projection: StakeholderProjection;
	audience: StakeholderAudience;
	detailLevel: NarrativeDetailLevel;
	feedbackActorRole: NarrativeFeedbackActorRole;
	killSwitchActive: boolean;
	recallLaneItems: NarrativeRecallLaneItem[];
	askWhyState: AskWhyState;
	advancedAnalysisOpen: boolean;
	onAdvancedAnalysisOpenChange: (open: boolean) => void;
	onAudienceChange: (audience: StakeholderAudience) => void;
	onFeedbackActorRoleChange: (role: NarrativeFeedbackActorRole) => void;
	onSubmitFeedback: (feedback: NarrativeFeedbackAction) => void;
	onOpenEvidence: OpenEvidenceHandler;
	onOpenRawDiff: (laneContext?: RecallLaneEvidenceContext) => void;
	onSubmitAskWhy: (question: string) => void;
	onOpenAskWhyCitation: (citation: AskWhyCitation) => void;
	onAdvancedControlUsed?: (control: string) => void;
}) {
	const advancedAnalysisId = useId();
	const handleRecallLaneOpen = (item: NarrativeRecallLaneItem) => {
		if (killSwitchActive) {
			onOpenRawDiff({
				source: "recall_lane",
				recallLaneItemId: item.id,
				recallLaneConfidenceBand: item.confidenceTier,
			});
			return;
		}

		const firstEvidence = item.evidenceLinks[0];
		if (firstEvidence) {
			onOpenEvidence(firstEvidence, {
				source: "recall_lane",
				recallLaneItemId: item.id,
				recallLaneConfidenceBand: item.confidenceTier,
			});
			return;
		}

		onOpenRawDiff({
			source: "recall_lane",
			recallLaneItemId: item.id,
			recallLaneConfidenceBand: item.confidenceTier,
		});
	};

	const whySignals = deriveWhySignals(narrative, projection, recallLaneItems);
	const sequenceSteps: SequenceStep[] =
		recallLaneItems.length > 0
			? recallLaneItems.map((item) => ({
					id: item.id,
					title: item.title,
					body: item.whyThisMatters,
					actionLabel: item.evidenceLinks[0]
						? "Open evidence"
						: "Open raw diff",
					confidenceLabel: `${item.confidenceTier} ${(item.confidence * 100).toFixed(0)}%`,
					onOpen: () => handleRecallLaneOpen(item),
				}))
			: narrative.highlights.slice(0, 3).map((highlight) => ({
					id: highlight.id,
					title: highlight.title,
					body: highlight.whyThisMatters,
					actionLabel: highlight.evidenceLinks[0]
						? "Open evidence"
						: "Open raw diff",
					onOpen: () => {
						const evidenceLink = highlight.evidenceLinks[0];
						if (evidenceLink) {
							onOpenEvidence(evidenceLink);
							return;
						}
						onOpenRawDiff();
					},
				}));

	return (
		<div className="mt-4 space-y-4">
			<SectionCard
				eyebrow="Branch thesis"
				title={projection.headline || "Current branch interpretation"}
				variant="hero"
			>
				<p className="max-w-3xl text-sm leading-7 text-text-secondary">
					{narrative.summary}
				</p>
				<div className="mt-4 flex flex-wrap items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em]">
					<span className="rounded-full border border-accent-blue-light bg-accent-blue-bg px-2 py-1 text-accent-blue">
						Confidence {(narrative.confidence * 100).toFixed(0)}%
					</span>
					<span className="rounded-full border border-border-subtle bg-bg-secondary px-2 py-1 text-text-secondary">
						State {narrative.state}
					</span>
				</div>
			</SectionCard>

			<SectionCard
				eyebrow="Why we believe this"
				title="A short read on what supports the current interpretation"
			>
				<ul className="space-y-2 text-sm leading-6 text-text-secondary">
					{whySignals.map((signal) => (
						<li
							key={signal}
							className="rounded-xl border border-border-subtle bg-bg-secondary/85 px-3.5 py-3"
						>
							{signal}
						</li>
					))}
				</ul>
			</SectionCard>

			<SectionCard
				eyebrow="Causal sequence"
				title="The strongest steps we can currently walk through"
			>
				{sequenceSteps.length === 0 ? (
					<p className="text-sm leading-6 text-text-secondary">
						No ranked causal steps are available yet. Use the evidence rail or
						raw diff to verify this branch manually.
					</p>
				) : (
					<ol className="space-y-3" aria-live="polite">
						{sequenceSteps.map((step, index) => (
							<li
								key={step.id}
								className="rounded-[1.1rem] border border-border-subtle bg-bg-secondary/90 p-3.5"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<div className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border-light bg-bg-primary px-2 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-text-muted">
											{index + 1}
										</div>
										<div className="mt-1 text-sm font-medium text-text-primary">
											{step.title}
										</div>
									</div>
									{step.confidenceLabel ? (
										<span
											className={`text-[0.6875rem] font-medium uppercase ${confidenceTierStyle(
												recallLaneItems[index]?.confidenceTier ?? "low",
											)}`}
										>
											{step.confidenceLabel}
										</span>
									) : null}
								</div>
								<p className="mt-2 text-xs leading-6 text-text-tertiary">
									{step.body}
								</p>
								<button
									type="button"
									onClick={step.onOpen}
									className="mt-3 rounded-full border border-border-light bg-bg-primary px-3 py-1.5 text-[0.6875rem] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
								>
									{step.actionLabel}
								</button>
							</li>
						))}
					</ol>
				)}
			</SectionCard>

			<SectionCard
				eyebrow="Raw diff access"
				title="Use direct code context when the interpretation feels too soft"
				variant="diff"
			>
				<p className="text-sm leading-6 text-text-secondary">
					Open raw diff to validate this branch directly against commit-level
					change context.
				</p>
				<button
					type="button"
					onClick={() => onOpenRawDiff()}
					className="mt-3 inline-flex rounded-full border border-accent-amber-light bg-bg-primary/80 px-3.5 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
				>
					Open raw diff
				</button>
				{narrative.state === "needs_attention" && narrative.fallbackReason ? (
					<p className="mt-3 text-xs leading-5 text-accent-amber">
						{narrative.fallbackReason}
					</p>
				) : null}
			</SectionCard>

			<section
				className="rounded-[1.3rem] border border-border-light bg-bg-primary/76 px-4 py-3.5"
				aria-labelledby={`${advancedAnalysisId}-toggle`}
			>
				<button
					id={`${advancedAnalysisId}-toggle`}
					type="button"
					aria-expanded={advancedAnalysisOpen}
					aria-controls={advancedAnalysisId}
					onClick={() => onAdvancedAnalysisOpenChange(!advancedAnalysisOpen)}
					className="flex w-full items-center gap-2 text-left text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
				>
					<span className="flex h-4 w-4 items-center justify-center rounded-sm bg-bg-secondary transition-colors motion-reduce:transition-none">
						<svg
							className={`h-3 w-3 transition-transform motion-reduce:transition-none ${advancedAnalysisOpen ? "rotate-90" : ""}`}
							viewBox="0 0 16 16"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<title>Toggle advanced analysis</title>
							<path
								d="M6 12L10 8L6 4"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
					<span>Advanced analysis</span>
				</button>
				{/* biome-ignore lint/a11y/useSemanticElements: collapsible region panel, not a standalone landmark */}
				<div
					id={advancedAnalysisId}
					role="region"
					aria-labelledby={`${advancedAnalysisId}-toggle`}
					className={`mt-4 space-y-4 ${advancedAnalysisOpen ? "block" : "hidden"}`}
				>
					<AskWhyAnswerCard
						state={askWhyState}
						onSubmit={(question) => {
							onAdvancedControlUsed?.("ask-why");
							onSubmitAskWhy(question);
						}}
						onOpenCitation={(citation) => {
							onAdvancedControlUsed?.("ask-why-citation");
							onOpenAskWhyCitation(citation);
						}}
						onOpenRawDiff={onOpenRawDiff}
						disabled={killSwitchActive}
					/>

					<div className="space-y-3 rounded-lg border border-border-subtle bg-bg-secondary p-3">
						<div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
							Audience lens
						</div>
						<div className="flex flex-wrap items-center gap-1">
							{(["executive", "manager", "engineer"] as const).map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => {
										onAdvancedControlUsed?.("audience-lens");
										onAudienceChange(option);
									}}
									disabled={killSwitchActive}
									className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-green-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
										audience === option
											? "border-accent-green-light bg-accent-green-bg text-accent-green"
											: "border-border-subtle bg-bg-primary text-text-secondary hover:border-border-light hover:bg-bg-secondary"
									}`}
									aria-pressed={audience === option}
								>
									{option}
								</button>
							))}
						</div>
						<div className="rounded-lg border border-border-subtle bg-bg-primary p-3">
							<div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
								{projection.audience}
							</div>
							<p className="mt-1 text-sm text-text-primary">
								{projection.headline}
							</p>
							<ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-text-secondary">
								{projection.bullets.slice(0, 3).map((bullet) => (
									<li key={bullet}>{bullet}</li>
								))}
							</ul>
						</div>
					</div>

					<div className="space-y-3 rounded-lg border border-border-subtle bg-bg-secondary p-3">
						<div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
							Feedback controls
						</div>
						<div className="flex flex-wrap items-center gap-1">
							{(["developer", "reviewer"] as const).map((role) => (
								<button
									key={role}
									type="button"
									onClick={() => {
										onAdvancedControlUsed?.("feedback-role");
										onFeedbackActorRoleChange(role);
									}}
									disabled={killSwitchActive}
									className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
										feedbackActorRole === role
											? "border-accent-blue-light bg-accent-blue-bg text-accent-blue"
											: "border-border-subtle bg-bg-primary text-text-secondary hover:border-border-light hover:bg-bg-secondary"
									}`}
									aria-pressed={feedbackActorRole === role}
								>
									{role}
								</button>
							))}
							<button
								type="button"
								onClick={() => {
									onAdvancedControlUsed?.("feedback-action");
									onSubmitFeedback({
										actorRole: feedbackActorRole,
										feedbackType: "branch_missing_decision",
										targetKind: "branch",
										detailLevel,
									});
								}}
								disabled={killSwitchActive}
								className="rounded-md border border-border-subtle bg-bg-primary px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-border-light hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
							>
								Missing decision
							</button>
						</div>

						<ul className="space-y-2">
							{narrative.highlights.slice(0, 3).map((highlight) => (
								<li
									key={highlight.id}
									className="rounded-lg border border-border-subtle bg-bg-primary p-3"
								>
									<div className="text-sm font-medium text-text-primary">
										{highlight.title}
									</div>
									<p className="mt-1 text-xs leading-relaxed text-text-tertiary">
										{highlight.whyThisMatters}
									</p>
									<div className="mt-2 flex items-center gap-1">
										<button
											type="button"
											disabled={killSwitchActive}
											onClick={() => {
												onAdvancedControlUsed?.("feedback-action");
												onSubmitFeedback({
													actorRole: feedbackActorRole,
													feedbackType: "highlight_key",
													targetKind: "highlight",
													targetId: highlight.id,
													detailLevel,
												});
											}}
											className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-[0.6875rem] text-text-secondary transition-colors hover:border-border-light hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
										>
											This is key
										</button>
										<button
											type="button"
											disabled={killSwitchActive}
											onClick={() => {
												onAdvancedControlUsed?.("feedback-action");
												onSubmitFeedback({
													actorRole: feedbackActorRole,
													feedbackType: "highlight_wrong",
													targetKind: "highlight",
													targetId: highlight.id,
													detailLevel,
												});
											}}
											className="rounded-md border border-border-subtle bg-bg-primary px-2 py-1 text-[0.6875rem] text-text-secondary transition-colors hover:border-border-light hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
										>
											Wrong
										</button>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>
		</div>
	);
}

export function EvidenceSection({
	evidenceLinks,
	onOpenEvidence,
}: {
	evidenceLinks: NarrativeEvidenceLink[];
	onOpenEvidence: OpenEvidenceHandler;
}) {
	return (
		<div className="mt-4 space-y-3">
			{evidenceLinks.length === 0 ? (
				<div className="rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-tertiary">
					No linked evidence yet. Use raw diff until more evidence is available.
				</div>
			) : (
				evidenceLinks.map((link) => (
					<button
						key={link.id}
						type="button"
						onClick={() => onOpenEvidence(link)}
						className="w-full rounded-lg border border-border-subtle bg-bg-primary px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-border-light hover:bg-bg-secondary"
					>
						<span className="font-medium text-text-primary">{link.label}</span>
						<span className="ml-2 uppercase tracking-wide text-text-muted">
							{link.kind}
						</span>
					</button>
				))
			)}
		</div>
	);
}

export function DiffSection({ onOpenRawDiff }: { onOpenRawDiff: () => void }) {
	return (
		<div className="mt-4 rounded-lg border border-border-subtle bg-bg-primary p-4">
			<p className="text-sm text-text-secondary">
				Open raw diff to verify narrative claims directly against commit-level
				evidence.
			</p>
			<button
				type="button"
				onClick={onOpenRawDiff}
				className="mt-3 inline-flex rounded-md border border-border-light bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-primary"
			>
				Open raw diff context
			</button>
		</div>
	);
}
