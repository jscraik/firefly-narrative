import { useEffect, useRef, useState } from "react";
import { DiffDock } from "./right-panel-tabs/DiffDock";
import { RightPanelTabBar } from "./right-panel-tabs/RightPanelTabBar";
import { RightPanelTabPanels } from "./right-panel-tabs/RightPanelTabPanels";
import {
	type RightPanelTabsProps,
	resolveVerificationModeState,
	type TabId,
	type VerificationMode,
} from "./right-panel-tabs/types";

export type { RightPanelTabsProps } from "./right-panel-tabs/types";

function resolveVerificationMode(props: RightPanelTabsProps): VerificationMode {
	if (props.verificationMode) return props.verificationMode;

	const hasSessionContent = Boolean(
		props.sessionExcerpts && props.sessionExcerpts.length > 0,
	);
	const hasEvidenceContent = Boolean(props.traceSummary || props.traceStatus);
	const hasValidationContent =
		Boolean(props.testRun) || Boolean(props.selectedCommitSha);

	return resolveVerificationModeState({
		hasSessionContent,
		hasEvidenceContent,
		hasValidationContent,
	}).mode;
}

function resolveDefaultTab(
	mode: VerificationMode,
	props: RightPanelTabsProps,
): TabId {
	const hasSessionContent = Boolean(
		props.sessionExcerpts && props.sessionExcerpts.length > 0,
	);
	const hasEvidenceContent = Boolean(props.traceSummary || props.traceStatus);
	const hasTestContent =
		Boolean(props.testRun) || Boolean(props.selectedCommitSha);

	if (mode === "evidence-first") {
		if (hasEvidenceContent) return "attribution";
		if (hasTestContent) return "tests";
		if (hasSessionContent) return "session";
		return "settings";
	}
	if (mode === "session-first") {
		return hasSessionContent ? "session" : "settings";
	}
	if (hasTestContent) return "tests";
	if (hasEvidenceContent) return "attribution";
	if (hasSessionContent) return "session";
	return "settings";
}

export function RightPanelTabs(props: RightPanelTabsProps) {
	const verificationMode = resolveVerificationMode(props);
	const defaultTab = resolveDefaultTab(verificationMode, props);
	const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
	const [diffExpanded, setDiffExpanded] = useState(
		verificationMode === "diff-first",
	);
	const [diffPip, setDiffPip] = useState(false);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
		null,
	);
	const lastBranchScopeRef = useRef<string | undefined>(props.branchScopeKey);

	const {
		sessionExcerpts,
		selectedCommitId,
		testRun,
		selectedCommitSha,
		selectedFile,
		diffText,
		loadingDiff,
		traceRanges,
	} = props;

	const hasSessionContent = Boolean(
		sessionExcerpts && sessionExcerpts.length > 0,
	);
	const hasAttributionContent = Boolean(
		props.traceSummary || props.traceStatus,
	);
	const hasAtlasContent = true;
	const hasTestContent = Boolean(testRun) || Boolean(selectedCommitSha);

	useEffect(() => {
		if (lastBranchScopeRef.current === props.branchScopeKey) {
			return;
		}
		lastBranchScopeRef.current = props.branchScopeKey;
		setActiveTab(defaultTab);
		setDiffExpanded(verificationMode === "diff-first");
		setDiffPip(false);
		setSelectedSessionId(null);
	}, [defaultTab, props.branchScopeKey, verificationMode]);

	useEffect(() => {
		if (!sessionExcerpts || sessionExcerpts.length === 0) {
			setSelectedSessionId(null);
			return;
		}

		if (selectedCommitId) {
			const linked = sessionExcerpts.find(
				(session) => session.linkedCommitSha === selectedCommitId,
			);
			if (linked && linked.id !== selectedSessionId) {
				setSelectedSessionId(linked.id);
				return;
			}
		}

		if (
			!selectedSessionId ||
			!sessionExcerpts.some((session) => session.id === selectedSessionId)
		) {
			setSelectedSessionId(sessionExcerpts[0]?.id ?? null);
		}
	}, [selectedCommitId, selectedSessionId, sessionExcerpts]);

	const verificationTone =
		verificationMode === "evidence-first"
			? "border-accent-green-light bg-accent-green-bg text-accent-green"
			: verificationMode === "session-first"
				? "border-accent-blue-light bg-accent-blue-bg text-accent-blue"
				: "border-accent-amber-light bg-accent-amber-bg text-accent-amber";
	const verificationLabel =
		verificationMode === "evidence-first"
			? "Evidence first"
			: verificationMode === "session-first"
				? "Session first"
				: "Diff first";
	const verificationBody =
		verificationMode === "evidence-first"
			? "Trace-backed or test-backed evidence is available, so the rail opens on the safest validating surface first."
			: verificationMode === "session-first"
				? "Session joins are the strongest available support for this branch right now."
				: "The branch needs direct diff verification first because stronger supporting evidence is thin.";

	return (
		<section
			id="verification-rail"
			className="relative flex h-full min-h-0 flex-col gap-4 rounded-[1.6rem] border border-border-light bg-[linear-gradient(135deg,rgba(18,25,39,0.98),rgba(12,18,30,0.98))] p-4 shadow-[0_30px_100px_-52px_rgba(15,23,42,0.82)]"
		>
			<div className="rounded-[1.25rem] border border-border-light bg-bg-primary/70 p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<div className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
							Verification rail
						</div>
						<div className="mt-1 text-xl font-semibold tracking-[-0.02em] text-text-primary">
							Why we trust this branch, and what to verify next
						</div>
					</div>
					<span
						className={`inline-flex rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${verificationTone}`}
					>
						{verificationLabel}
					</span>
				</div>
				<p className="mt-3 text-sm leading-6 text-text-secondary">
					{verificationBody}
				</p>
			</div>

			<RightPanelTabBar
				activeTab={activeTab}
				onChangeTab={setActiveTab}
				hasSessionContent={hasSessionContent}
				hasAttributionContent={hasAttributionContent}
				hasAtlasContent={hasAtlasContent}
				hasTestContent={hasTestContent}
			/>

			<div className="min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-border-light bg-bg-primary/70 p-4">
				<RightPanelTabPanels
					{...props}
					activeTab={activeTab}
					selectedSessionId={selectedSessionId}
					onSelectSession={setSelectedSessionId}
					hasAttributionContent={hasAttributionContent}
					onOpenAttribution={() => setActiveTab("attribution")}
				/>
			</div>

			<DiffDock
				selectedFile={selectedFile}
				diffExpanded={diffExpanded}
				diffPip={diffPip}
				diffText={diffText}
				loadingDiff={loadingDiff}
				traceRanges={traceRanges}
				onToggleExpanded={() => setDiffExpanded((value) => !value)}
				onTogglePip={() => {
					setDiffPip((value) => !value);
					setDiffExpanded(true);
				}}
				onDock={() => setDiffPip(false)}
			/>
		</section>
	);
}
