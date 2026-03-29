import {
	type DriftReport,
	evaluateDriftDelta,
} from "../../core/narrative/automation";
import type { CaptureReliabilityStatus } from "../../core/tauri/ingestConfig";
import type {
	BranchNarrative,
	DataAuthorityTier,
	Mode,
	SessionExcerpt,
	Snapshot,
	SurfaceMode,
} from "../../core/types";
import type { RepoState } from "../../hooks/useRepoLoader";
import {
	deriveSurfaceTrustState,
	describeSurfaceTrust,
} from "./dashboardState";

function formatConfidence(confidence?: number): string {
	if (confidence === undefined) return "unknown";
	return `${Math.round(confidence * 100)}%`;
}

function calculateDeterministicCost(session: SessionExcerpt): string {
	// Heuristic: $0.10 base + $0.05 per 5 messages + $0.02 per message length / 1000
	const messageCount = session.messages.length;
	const totalLength = session.messages.reduce(
		(acc, m) => acc + (m.text?.length || 0),
		0,
	);
	const cost = 0.1 + messageCount * 0.05 + totalLength / 10000;
	return cost.toFixed(2);
}

// Re-export so existing consumers (tests, views) can still import from this module
export type { SurfaceMode } from "../../core/types";

type LegacySurfaceMode =
	| "live"
	| "transcripts"
	| "costs"
	| "setup"
	| "work-graph"
	| "repo-pulse"
	| "timeline"
	| "diffs"
	| "worktrees"
	| "env"
	| "status";

type NarrativeSurfaceRegistryMode = SurfaceMode | LegacySurfaceMode;

export type SurfaceTone =
	| "blue"
	| "violet"
	| "green"
	| "amber"
	| "red"
	| "slate";

export type SurfaceAuthorityCue = {
	authorityTier: DataAuthorityTier;
	authorityLabel: string;
};

export interface SurfaceMetric {
	label: string;
	value: string;
	detail: string;
	tone: SurfaceTone;
	authorityTier?: DataAuthorityTier;
	authorityLabel?: string;
}

export interface SurfaceHighlight {
	eyebrow: string;
	title: string;
	body: string;
	tone: SurfaceTone;
	authorityTier?: DataAuthorityTier;
	authorityLabel?: string;
	action?: SurfaceAction;
}

export type SurfaceAction =
	| {
			type: "open_evidence";
			evidenceId: string;
	  }
	| {
			type: "open_raw_diff";
			commitSha: string;
	  }
	| {
			type: "navigate";
			mode: Mode;
	  };

export interface SurfaceActivityItem {
	title: string;
	meta: string;
	detail: string;
	status: "ok" | "warn" | "critical" | "info";
	authorityTier?: DataAuthorityTier;
	authorityLabel?: string;
	action?: SurfaceAction;
}

export interface SurfaceTableRow {
	primary: string;
	secondary: string;
	tertiary: string;
	authorityTier?: DataAuthorityTier;
	authorityLabel?: string;
	action?: SurfaceAction;
}

export type SurfaceProvenanceNodeState =
	| "observed"
	| "linked"
	| "derived"
	| "review";

export interface SurfaceProvenanceNode {
	eyebrow: string;
	title: string;
	detail: string;
	state: SurfaceProvenanceNodeState;
	tone: SurfaceTone;
	edgeLabel?: string;
	authorityTier?: DataAuthorityTier;
	authorityLabel?: string;
	action?: SurfaceAction;
}

export interface SurfaceProvenancePanel {
	eyebrow: string;
	title: string;
	summary: string;
	footnote: string;
	nodes: Array<SurfaceProvenanceNode & SurfaceAuthorityCue>;
}

export interface NarrativeSurfaceViewModel {
	mode: NarrativeSurfaceRegistryMode;
	section: string;
	title: string;
	subtitle: string;
	heroTitle: string;
	heroBody: string;
	heroAuthorityTier: DataAuthorityTier;
	heroAuthorityLabel: string;
	trustState: "healthy" | "degraded";
	metrics: Array<SurfaceMetric & SurfaceAuthorityCue>;
	highlightsTitle: string;
	highlights: Array<SurfaceHighlight & SurfaceAuthorityCue>;
	activityTitle: string;
	activity: Array<SurfaceActivityItem & SurfaceAuthorityCue>;
	tableTitle: string;
	tableColumns: [string, string, string];
	tableRows: Array<SurfaceTableRow & SurfaceAuthorityCue>;
	provenance?: SurfaceProvenancePanel;
	footerNote: string;
	driftReport?: import("../../core/narrative/automation").DriftReport;
}

interface SurfaceContext {
	repoName: string;
	repoPath: string;
	commitCount: number;
	sessionCount: number;
	sessionExcerpts: SessionExcerpt[];
	changedFiles: string[];
	unlinkedSessionCount: number;
	narrative?: BranchNarrative;
	snapshots: Snapshot[];
	hasLiveRepoData: boolean;
	autoIngestEnabled: boolean;
	captureReliabilityMode: string;
	captureReliabilityStatus: CaptureReliabilityStatus | null | undefined;
	trustState: "healthy" | "degraded";
	trustLabel: string;
	trustAuthority: SurfaceAuthorityCue;
	driftReport?: DriftReport;
}

const FALLBACK_AUTHORITY: SurfaceAuthorityCue = {
	authorityTier: "static_scaffold",
	authorityLabel: "Preview",
};

const LOCAL_REPO_AUTHORITY: SurfaceAuthorityCue = {
	authorityTier: "derived_summary",
	authorityLabel: "Derived",
};

const LIVE_CAPTURE_AUTHORITY: SurfaceAuthorityCue = {
	authorityTier: "live_capture",
	authorityLabel: "Live",
};

const OTEL_ONLY_AUTHORITY: SurfaceAuthorityCue = {
	authorityTier: "derived_summary",
	authorityLabel: "OTEL",
};

function inferCaptureAuthority(
	captureReliabilityStatus?: CaptureReliabilityStatus | null,
): SurfaceAuthorityCue {
	if (!captureReliabilityStatus) {
		return LOCAL_REPO_AUTHORITY;
	}

	if (captureReliabilityStatus.mode === "OTEL_ONLY") {
		const trustState = deriveSurfaceTrustState(captureReliabilityStatus);
		return {
			...OTEL_ONLY_AUTHORITY,
			authorityLabel: trustState === "healthy" ? "OTEL" : "OTEL · degraded",
		};
	}

	return {
		...LIVE_CAPTURE_AUTHORITY,
		authorityLabel: "Live",
	};
}

type SurfaceAuthoritySeed = {
	authorityTier?: DataAuthorityTier;
	authorityLabel?: string;
};

function normalizeAuthority<T extends SurfaceAuthoritySeed>(
	item: T,
	fallback: SurfaceAuthorityCue,
): T & SurfaceAuthorityCue {
	return {
		...item,
		authorityTier: item.authorityTier ?? fallback.authorityTier,
		authorityLabel: item.authorityLabel ?? fallback.authorityLabel,
	};
}

function inferAuthorityFromText(
	text: string,
	context: SurfaceContext,
): SurfaceAuthorityCue {
	const lowered = text.toLowerCase();
	if (
		lowered.includes("capture") ||
		lowered.includes("trust") ||
		lowered.includes("stream")
	) {
		if (context.captureReliabilityMode === "OTEL_ONLY") {
			return { ...OTEL_ONLY_AUTHORITY };
		}

		return { ...LIVE_CAPTURE_AUTHORITY };
	}

	if (
		lowered.includes("repo") ||
		lowered.includes("session") ||
		lowered.includes("commit") ||
		lowered.includes("file") ||
		lowered.includes("branch") ||
		lowered.includes("path")
	) {
		return {
			authorityTier: context.hasLiveRepoData ? "live_repo" : "derived_summary",
			authorityLabel: context.hasLiveRepoData ? "Repo" : "Derived",
		};
	}

	return { ...FALLBACK_AUTHORITY };
}

function normalizeMetric(
	metric: SurfaceMetric,
	context: SurfaceContext,
): SurfaceMetric & SurfaceAuthorityCue {
	return normalizeAuthority(
		metric,
		inferAuthorityFromText(
			`${metric.label} ${metric.detail} ${metric.value}`,
			context,
		),
	);
}

function normalizeHighlight(
	highlight: SurfaceHighlight,
	context: SurfaceContext,
): SurfaceHighlight & SurfaceAuthorityCue {
	return normalizeAuthority(
		highlight,
		inferAuthorityFromText(
			`${highlight.eyebrow} ${highlight.title} ${highlight.body}`,
			context,
		),
	);
}

type ActivitySeed = {
	type: string;
	label: string;
	value: string;
	time: string;
	description: string;
	authority: SurfaceAuthorityCue;
	action?: SurfaceAction;
};

function normalizeActivity(
	activity: ActivitySeed,
): SurfaceActivityItem & SurfaceAuthorityCue {
	let status: SurfaceActivityItem["status"] = "info";
	const text =
		`${activity.label} ${activity.value} ${activity.description}`.toLowerCase();

	if (
		text.includes("fail") ||
		text.includes("critical") ||
		text.includes("error") ||
		text.includes("drift")
	) {
		status = "critical";
	} else if (
		text.includes("degraded") ||
		text.includes("warn") ||
		text.includes("spike")
	) {
		status = "warn";
	} else if (
		text.includes("pass") ||
		text.includes("ok") ||
		text.includes("active") ||
		text.includes("healthy") ||
		text.includes("imported")
	) {
		status = "ok";
	}

	return {
		title: `${activity.type}: ${activity.label}`,
		meta: activity.time,
		detail: `${activity.value} - ${activity.description}`,
		status: status,
		authorityTier: activity.authority.authorityTier,
		authorityLabel: activity.authority.authorityLabel,
		action: activity.action,
	};
}

function normalizeActivityItem(
	activity: SurfaceActivityItem,
	context: SurfaceContext,
): SurfaceActivityItem & SurfaceAuthorityCue {
	return normalizeAuthority(
		activity,
		inferAuthorityFromText(
			`${activity.title} ${activity.meta} ${activity.detail}`,
			context,
		),
	);
}

function _mapDriftStatusToActivityStatus(
	status: DriftReport["status"],
): SurfaceActivityItem["status"] {
	switch (status) {
		case "critical":
			return "critical";
		case "watch":
			return "warn";
		default:
			return "ok";
	}
}

function normalizeTableRow(
	row: SurfaceTableRow,
	context: SurfaceContext,
): SurfaceTableRow & SurfaceAuthorityCue {
	return normalizeAuthority(
		row,
		inferAuthorityFromText(
			`${row.primary} ${row.secondary} ${row.tertiary}`,
			context,
		),
	);
}

type SurfaceProvenancePanelSeed = Omit<SurfaceProvenancePanel, "nodes"> & {
	nodes: SurfaceProvenanceNode[];
};

function normalizeProvenanceNode(
	node: SurfaceProvenanceNode,
	context: SurfaceContext,
): SurfaceProvenanceNode & SurfaceAuthorityCue {
	return normalizeAuthority(
		node,
		inferAuthorityFromText(
			`${node.eyebrow} ${node.title} ${node.detail}`,
			context,
		),
	);
}

type SurfaceDefinition = {
	section: string;
	title: string;
	subtitle: (context: SurfaceContext) => string;
	heroTitle: (context: SurfaceContext) => string;
	heroBody: (context: SurfaceContext) => string;
	metrics: (context: SurfaceContext) => SurfaceMetric[];
	highlightsTitle: string;
	highlights: (context: SurfaceContext) => SurfaceHighlight[];
	activityTitle: string;
	activity: (context: SurfaceContext) => SurfaceActivityItem[];
	tableTitle: string;
	tableColumns: [string, string, string];
	tableRows: (context: SurfaceContext) => SurfaceTableRow[];
	provenance?: (context: SurfaceContext) => SurfaceProvenancePanelSeed;
	footerNote: (context: SurfaceContext) => string;
};

function getRepoName(repoState: RepoState): string {
	if (repoState.status !== "ready") return "Trace Narrative workspace";
	const parts = repoState.repo.root.split("/").filter(Boolean);
	return parts.length > 0 ? parts[parts.length - 1] : repoState.repo.root;
}

function getRepoPath(repoState: RepoState): string {
	if (repoState.status === "ready") return repoState.repo.root;
	if (repoState.status === "loading" || repoState.status === "error") {
		return repoState.path ?? "~/dev/trace-narrative";
	}
	return "~/dev/trace-narrative";
}

function buildContext(
	repoState: RepoState,
	captureReliabilityStatus?: CaptureReliabilityStatus | null,
	autoIngestEnabled?: boolean,
): SurfaceContext {
	const commitCount =
		repoState.status === "ready"
			? Math.max(repoState.model.timeline.length, 1)
			: 47;
	const sessionExcerpts =
		repoState.status === "ready" ? (repoState.model.sessionExcerpts ?? []) : [];
	const sessionCount =
		repoState.status === "ready" ? Math.max(sessionExcerpts.length, 0) : 0;
	const trust = describeSurfaceTrust(captureReliabilityStatus);
	const hasLiveRepoData = repoState.status === "ready";

	const changedFiles =
		repoState.status === "ready"
			? (repoState.model.dirtyFiles ??
				repoState.model.filesChanged?.map((f) => f.path) ??
				[])
			: [];
	const unlinkedSessionCount = sessionExcerpts.filter(
		(s) => !s.linkedCommitSha,
	).length;
	const narrative =
		repoState.status === "ready" ? repoState.model.narrative : undefined;
	const snapshots =
		repoState.status === "ready" ? (repoState.model.snapshots ?? []) : [];

	return {
		repoName: getRepoName(repoState),
		repoPath: getRepoPath(repoState),
		commitCount,
		sessionCount,
		sessionExcerpts,
		changedFiles,
		unlinkedSessionCount,
		narrative,
		snapshots,
		hasLiveRepoData,
		autoIngestEnabled: autoIngestEnabled ?? false,
		captureReliabilityMode:
			captureReliabilityStatus?.mode ?? trust.reliabilityMode,
		captureReliabilityStatus,
		trustState: trust.trustState,
		trustLabel: trust.trustLabel,
		trustAuthority: captureReliabilityStatus
			? inferCaptureAuthority(captureReliabilityStatus)
			: LOCAL_REPO_AUTHORITY,
		driftReport:
			repoState.status === "ready"
				? evaluateDriftDelta(repoState.model)
				: undefined,
	};
}

const surfaceDefinitions: Record<
	NarrativeSurfaceRegistryMode,
	SurfaceDefinition
> = {
	"work-graph": {
		section: "Narrative",
		title: "Story Map",
		subtitle: () =>
			"Cross-repo branch narratives, trust hotspots, and evidence gaps that deserve attention.",
		heroTitle: (context) =>
			`See where ${context.repoName} fits inside the wider story map.`,
		heroBody: (_context) =>
			"This view maps active repos, sleeping branches, and fragile trust lanes so the workspace reads like connected evidence chains instead of disconnected status cards.",
		metrics: (context) => [
			{
				label: "Active repos",
				value: "8",
				detail: "4 pushed in the last 24h",
				tone: "blue",
			},
			{
				label: "Dormant lanes",
				value: "3",
				detail: "Need explicit follow-up",
				tone: "amber",
			},
			{
				label: "Linked stories",
				value: `${context.commitCount}`,
				detail: "Commits represented in graph",
				tone: "violet",
			},
			{
				label: "Drift status",
				value: "CRITICAL",
				description: "Mocked critical drift alert.",
				status: "critical",
				detail: context.driftReport
					? context.driftReport.metrics[0].rationale
					: "Gathering workspace signals...",
				tone: !context.driftReport
					? "slate"
					: context.driftReport.status === "healthy"
						? "green"
						: context.driftReport.status === "watch"
							? "amber"
							: "red",
				authorityTier: "system_signal",
				authorityLabel: "Drift signal",
			},
			{
				label: "Trust posture",
				value: context.trustState === "healthy" ? "Stable" : "Review",
				detail: context.trustLabel,
				tone: context.trustState === "healthy" ? "green" : "amber",
			},
		],
		highlightsTitle: "Graph lenses",
		highlights: () => [
			{
				eyebrow: "Hot path",
				title: "Evidence + telemetry knot",
				body: "Recent work keeps converging on dashboard, capture, and rollout verification lanes. That overlap is where trace confidence is won or lost.",
				tone: "violet",
			},
			{
				eyebrow: "Dormant risk",
				title: "Spec drift on older plans",
				body: "Older planning artifacts are aging faster than implementation notes. Treat them as archival until revalidated.",
				tone: "amber",
			},
			{
				eyebrow: "Narrative moat",
				title: "Trace-first provenance lane",
				body: "Keep explainability and evidence trails visible at the graph level so this view feels more trustworthy than a generic activity chart.",
				tone: "blue",
			},
		],
		activityTitle: "Recent graph movements",
		activity: (context) => [
			{
				title: "trace-narrative",
				meta: "now",
				detail: `${context.commitCount} commits contribute to the active narrative loop`,
				status: "ok",
			},
			{
				title: "coding-harness",
				meta: "42m ago",
				detail: "Environment gate cleared after rollout evidence refresh",
				status: "info",
			},
			{
				title: "config/codex",
				meta: "1h ago",
				detail:
					"Automation governance changes touched multiple operator surfaces",
				status: "warn",
			},
			{
				title: "otel-collector",
				meta: "2h ago",
				detail:
					"Telemetry hardening remains a shared dependency for trust-heavy views",
				status: "info",
			},
		],
		tableTitle: "Repos needing attention",
		tableColumns: ["Repository", "Pressure", "Next move"],
		tableRows: (context) => [
			{
				primary: context.repoName,
				secondary: context.hasLiveRepoData ? "Active evidence lane" : "Preview",
				tertiary: `Tracking ${context.commitCount} commits and ${context.sessionCount} sessions.`,
			},
			{
				primary: "coding-harness",
				secondary: "Stable baseline",
				tertiary: "High-confidence automated benchmarks",
			},
			{
				primary: "config/codex",
				secondary: "Rule lane",
				tertiary: "Guardrails aligned with recent rollout",
			},
			{
				primary: "otel-collector",
				secondary: "System bus",
				tertiary: "Telemetry source for all views",
			},
		],
		provenance: (context) => ({
			eyebrow: "Signature view",
			title: "Trace provenance lane",
			summary:
				"Read this rail left to right to see where the story is directly observed, where it is only joined by evidence, and where the operator still needs to verify the claim.",
			footnote:
				context.unlinkedSessionCount === 0
					? "All visible sessions currently join to a commit or evidence lane."
					: `${context.unlinkedSessionCount} session${context.unlinkedSessionCount === 1 ? "" : "s"} still float outside a commit join and should stay visible as unresolved work.`,
			nodes: [
				{
					eyebrow: "Observed",
					title:
						context.captureReliabilityMode === "HYBRID_ACTIVE"
							? "Capture posture is live"
							: "Capture posture is constrained",
					detail:
						context.captureReliabilityMode === "HYBRID_ACTIVE"
							? "Codex capture and local repo state are arriving together."
							: `Current posture: ${context.trustLabel}`,
					state: "observed",
					tone: context.trustState === "healthy" ? "blue" : "amber",
					authorityTier: context.trustAuthority.authorityTier,
					authorityLabel: context.trustAuthority.authorityLabel,
				},
				{
					eyebrow: "Joined",
					title:
						context.unlinkedSessionCount === 0
							? "Sessions join to commits"
							: "Floating sessions remain",
					detail:
						context.unlinkedSessionCount === 0
							? "The active branch story has commit-linked session evidence."
							: "Some session evidence still needs a commit or file join before the graph can be trusted.",
					state: "linked",
					tone: context.unlinkedSessionCount === 0 ? "green" : "amber",
					edgeLabel: "linked via",
					action: { type: "navigate", mode: "sessions" },
				},
				{
					eyebrow: "Derived",
					title: context.narrative
						? "Narrative claim is assembled"
						: "Narrative is still provisional",
					detail:
						context.narrative?.summary ??
						"Claims remain scaffolded until repo evidence is opened and reviewed.",
					state: "derived",
					tone: context.narrative ? "violet" : "slate",
					edgeLabel: "supports",
					action: context.narrative?.evidenceLinks[0]
						? {
								type: "open_evidence",
								evidenceId: context.narrative.evidenceLinks[0].id,
							}
						: { type: "navigate", mode: "repo" },
				},
				{
					eyebrow: "Decision",
					title:
						context.trustState === "healthy"
							? "Open repo evidence next"
							: "Pause and verify trust first",
					detail:
						context.trustState === "healthy"
							? "The branch story is ready for deeper inspection in Repo Evidence."
							: "Use Trust Center and Live Capture before accepting derived claims as stable.",
					state: "review",
					tone: context.trustState === "healthy" ? "green" : "red",
					edgeLabel: "gates",
					authorityTier:
						context.trustState === "healthy" ? "live_repo" : "system_signal",
					authorityLabel:
						context.trustState === "healthy" ? "Repo ready" : "Gate active",
					action: {
						type: "navigate",
						mode: context.trustState === "healthy" ? "repo" : "hygiene",
					},
				},
			],
		}),
		footerNote: () =>
			"Recommended next step: use this page to spot the weak joins first, then drop into Repo Evidence for the underlying branch story.",
	},
	live: {
		section: "Evidence",
		title: "Live",
		subtitle: () =>
			"Active agent sessions, capture reliability, and current operator load.",
		heroTitle: () => "Watch the workspace while it is still changing.",
		heroBody: (context) =>
			`This live surface is designed to be ambient and useful, while keeping the signal anchored to reliability and reviewability for ${context.repoName}.`,
		metrics: (context) => [
			{
				label: "Active sessions",
				value: `${context.sessionCount}`,
				detail: "Across connected agent tools",
				tone: "green",
			},
			{
				label: "Stale sessions",
				value: "2",
				detail: "Candidates for cleanup or reconnection",
				tone: "amber",
			},
			{
				label: "Capture mode",
				value: context.trustState === "healthy" ? "Hybrid" : "Degraded",
				detail: context.trustLabel,
				tone: context.trustState === "healthy" ? "blue" : "amber",
			},
			{
				label: "Action latency",
				value: "<100ms",
				detail: "Interaction acknowledgement target",
				tone: "violet",
			},
		],
		highlightsTitle: "Live monitors",
		highlights: () => [
			{
				eyebrow: "Sessions",
				title: "Agent activity strip",
				body: "Show current sessions, stale age, memory pressure, and whether logs are still ingesting.",
				tone: "green",
			},
			{
				eyebrow: "Reliability",
				title: "Capture trust rail",
				body: "Keep degraded capture visible in the header and in row-level status so the operator never assumes perfect truth.",
				tone: "amber",
			},
			{
				eyebrow: "Intervention",
				title: "Human override point",
				body: "The view should recommend when to reopen a repo, re-import, or run a smoke check instead of silently failing.",
				tone: "blue",
			},
		],
		activityTitle: "Current stream",
		activity: (context) => [
			...context.sessionExcerpts.slice(0, 3).map((s) =>
				normalizeActivity({
					type: "Live",
					label: `${s.tool} session`,
					value: "Imported",
					description: `Linked at ${formatConfidence(s.linkConfidence)} confidence`,
					time: s.importedAtISO || "now",
					authority: LIVE_CAPTURE_AUTHORITY,
				}),
			),
			{
				title: "Repo index stable",
				meta: "now",
				detail: "No re-scan required for current dashboard slice",
				status: "info",
				authorityTier: "live_repo",
				authorityLabel: "Local indexer",
			},
		],
		tableTitle: "Live lanes",
		tableColumns: ["Lane", "State", "Operator note"],
		tableRows: (context) => {
			const toolCues = Array.from(
				new Set(context.sessionExcerpts.map((s) => s.tool)),
			).filter(Boolean);
			return [
				...toolCues.map((t) => ({
					primary: String(t),
					secondary: context.sessionExcerpts.some((s) => s.tool === t)
						? "Active"
						: "Standby",
					tertiary: `${context.sessionExcerpts.filter((s) => s.tool === t).length} sessions in history`,
				})),
				{
					primary: "OTEL receiver",
					secondary: context.trustState === "healthy" ? "Watching" : "Degraded",
					tertiary: context.trustLabel,
				},
			].slice(0, 4);
		},
		footerNote: () =>
			"This page should feel ambient and calm: quick to scan, explicit about trust, and never noisy for the sake of motion.",
	},
	sessions: {
		section: "Evidence",
		title: "Sessions",
		subtitle: () => "History of interactive traces and captures",
		heroTitle: (context) =>
			`Browse session history without leaving ${context.repoName}.`,
		heroBody: () =>
			"Session history deserves a dedicated operational index, not just excerpts buried inside repo mode. This view makes those histories first-class.",
		metrics: (context) => [
			{
				label: "Total sessions",
				value: String(context.sessionCount),
				detail: "Indexed across all sources",
				tone: "blue",
			},
			{
				label: "Recorded today",
				value: String(
					context.sessionExcerpts.filter((s) => {
						const today = new Date().toISOString().split("T")[0];
						return s.importedAtISO?.startsWith(today);
					}).length,
				),
				detail: "New captures since midnight",
				tone: "violet",
			},
			{
				label: "Auto-imports",
				value: context.autoIngestEnabled ? "Active" : "Standby",
				detail: context.autoIngestEnabled
					? "Listening for file changes"
					: "Manual imports only",
				tone: context.autoIngestEnabled ? "green" : "slate",
			},
			{
				label: "Primary model",
				value: "GPT-5",
				detail: "Most recent session mix",
				tone: "green",
			},
		],
		highlightsTitle: "Session lenses",
		highlights: () => [
			{
				eyebrow: "Searchable",
				title: "Fast transcript lookup",
				body: "Prioritize filters for agent, repo, recency, and linked commit confidence.",
				tone: "blue",
			},
			{
				eyebrow: "Trust-aware",
				title: "Low-confidence links stay obvious",
				body: "Expose why a session is linked and when the evidence is incomplete.",
				tone: "amber",
			},
			{
				eyebrow: "Actionable",
				title: "Session-to-repo bridge",
				body: "One click should move from a session summary into the exact repo narrative context.",
				tone: "violet",
			},
		],
		activityTitle: "Recent sessions",
		activity: (context) => [
			...context.sessionExcerpts.slice(0, 5).map((s) =>
				normalizeActivity({
					type: s.tool || "Session",
					label: s.messages[0]?.text.slice(0, 30) || "Active conversation",
					value: "Imported",
					description: `Imported session with ${s.redactionCount ?? 0} redactions`,
					time: s.importedAtISO || "Just now",
					authority: LIVE_CAPTURE_AUTHORITY,
				}),
			),
			{
				title: "Session capture service",
				meta: "Status",
				detail: context.trustLabel,
				status: context.trustState === "healthy" ? "ok" : "info",
			},
		],
		tableTitle: "Session queues",
		tableColumns: ["Session", "Link state", "Next step"],
		tableRows: (context) =>
			[
				...context.sessionExcerpts.slice(0, 4).map((s) => ({
					primary: s.messages[0]?.text.slice(0, 30) || "Session context",
					secondary: s.linkedCommitSha
						? `Linked to ${s.linkedCommitSha.slice(0, 7)}`
						: "Floating",
					tertiary: s.needsReview
						? "Validate association"
						: "Open repo evidence",
				})),
				...(context.sessionCount === 0
					? [
							{
								primary: "No sessions found",
								secondary: "-",
								tertiary: "Import a trace to begin",
							},
						]
					: []),
			].slice(0, 4),
		footerNote: () =>
			"Sessions should read like reviewable narrative evidence, not just log storage.",
	},
	transcripts: {
		section: "Evidence",
		title: "Transcripts",
		subtitle: () =>
			"Indexed conversation search across imported sessions and commits.",
		heroTitle: () => "Search the conversation layer directly.",
		heroBody: () =>
			"This surface focuses on precise lookup, quoted matches, and fast jumps into the surrounding repo or session context.",
		metrics: (context) => [
			{
				label: "Indexed transcripts",
				value: String(context.sessionCount),
				detail: "Across local agent tools",
				tone: "blue",
			},
			{
				label: "Total messages",
				value: String(
					context.sessionExcerpts.reduce(
						(acc, s) => acc + s.messages.length,
						0,
					),
				),
				detail: "Available for deep search",
				tone: "violet",
			},
			{
				label: "Redactions applied",
				value: String(
					context.sessionExcerpts.reduce(
						(acc, s) => acc + (s.redactionCount || 0),
						0,
					),
				),
				detail: "Unsafe content hidden",
				tone: "green",
			},
			{
				label: "Search freshness",
				value: "Live",
				detail: "Indexes refresh after import",
				tone: "slate",
			},
		],
		highlightsTitle: "Search patterns",
		highlights: () => [
			{
				eyebrow: "Query",
				title: "Find why a file changed",
				body: "Search by symbol, branch name, or intent phrase, then pivot into the linked commit narrative.",
				tone: "violet",
			},
			{
				eyebrow: "Review",
				title: "Spot unsafe assumptions",
				body: "Surface transcripts with high tool usage or low-confidence links for manual review.",
				tone: "amber",
			},
			{
				eyebrow: "Trace",
				title: "Follow a decision",
				body: "Jump from a quoted answer to the exact file, diff, and evidence trail.",
				tone: "blue",
			},
		],
		activityTitle: "Search coverage",
		activity: (context) => {
			const toolGroups = Array.from(
				new Set(context.sessionExcerpts.map((s) => s.tool)),
			).filter(Boolean);
			return [
				...toolGroups.map((t) => ({
					title: `Search in ${t} sessions`,
					meta: `${context.sessionExcerpts.filter((s) => s.tool === t).length} sessions`,
					detail: `Covering ${context.sessionExcerpts.filter((s) => s.tool === t).reduce((acc, s) => acc + s.messages.length, 0)} messages`,
					status: "info" as const,
				})),
				...(context.sessionCount === 0
					? [
							{
								title: "No transcripts indexed",
								meta: "Empty",
								detail: "Import sessions to enable transcript search",
								status: "warn" as const,
							},
						]
					: []),
			].slice(0, 4);
		},
		tableTitle: "Transcript sources",
		tableColumns: ["Source", "Type", "Search depth"],
		tableRows: (context) =>
			[
				...context.sessionExcerpts.slice(0, 3).map((s) => ({
					primary: s.messages[0]?.text.slice(0, 25) || "Session",
					secondary: String(s.tool),
					tertiary: `${s.messages.length} interactions`,
				})),
				{
					primary: "Git History",
					secondary: "Repo",
					tertiary: `${context.commitCount} commit narratives`,
				},
			].slice(0, 4),
		footerNote: () =>
			"Search quality matters more than volume here; keep results trustworthy and fast to inspect.",
	},
	tools: {
		section: "Evidence",
		title: "Tools",
		subtitle: () =>
			"Usage mix, failure hotspots, and most-edited files across sessions.",
		heroTitle: () => "Understand how agent tools are shaping the repo.",
		heroBody: () =>
			"This page treats tool analytics as a first-class operator view while keeping the emphasis on where tool behavior produced meaningful repo impact.",
		metrics: (context) => [
			{
				label: "Active tools",
				value: String(new Set(context.sessionExcerpts.map((s) => s.tool)).size),
				detail: "Providing session traces",
				tone: "blue",
			},
			{
				label: "Hot tool",
				value: context.sessionExcerpts[0]?.tool || "None",
				detail: "Highest recent activity",
				tone: "violet",
			},
			{
				label: "Tool sessions",
				value: String(context.sessionCount),
				detail: "Total instrumented sessions",
				tone: "green",
			},
			{
				label: "Avg duration",
				value: `${Math.round(context.sessionExcerpts.reduce((acc, s) => acc + (s.durationMin || 0), 0) / (context.sessionCount || 1))}m`,
				detail: "Per session average",
				tone: "slate",
			},
		],
		highlightsTitle: "Tool insights",
		highlights: () => [
			{
				eyebrow: "Habits",
				title: "Tool mix over time",
				body: "Reveal when a branch relied on chat, shell, or file-edit loops and whether that created risk.",
				tone: "blue",
			},
			{
				eyebrow: "Pressure",
				title: "Retry concentration",
				body: "Highlight tools that correlate with parse errors, blocked commands, or manual handoffs.",
				tone: "amber",
			},
			{
				eyebrow: "Impact",
				title: "Most-edited files",
				body: "Promote files that absorb the most tool-driven churn so review effort follows reality.",
				tone: "violet",
			},
		],
		activityTitle: "Observed tool activity",
		activity: (context) =>
			[
				...context.sessionExcerpts.slice(0, 4).map((s) =>
					normalizeActivity({
						type: String(s.tool),
						label: s.messages[0]?.text.slice(0, 25) || "Tool session",
						value: s.durationMin ? `${s.durationMin}m` : "Active",
						description: `Linked by ${s.autoLinked ? "auto-link" : "manual"} at ${formatConfidence(s.linkConfidence)}`,
						time: s.importedAtISO || "Just now",
						authority: inferCaptureAuthority(context.captureReliabilityStatus),
					}),
				),
				...(context.sessionCount === 0
					? [
							{
								title: "No tool data",
								meta: "Waiting",
								detail: "Instrumented sessions will appear here",
								status: "info" as const,
							},
						]
					: []),
			].slice(0, 4),
		tableTitle: "Tool hotspots",
		tableColumns: ["Tool", "Efficiency", "Operator note"],
		tableRows: (context) =>
			[
				...Array.from(new Set(context.sessionExcerpts.map((s) => s.tool))).map(
					(t) => {
						const count = context.sessionExcerpts.filter(
							(s) => s.tool === t,
						).length;
						return {
							primary: String(t),
							secondary: count > 5 ? "High volume" : "Stable",
							tertiary: `${count} sessions tracked`,
						};
					},
				),
				{
					primary: "cli-shell",
					secondary: "Manual",
					tertiary: "Fallback for custom ops",
				},
			].slice(0, 4),
		footerNote: () =>
			"Tools view should help operators learn from execution patterns, not just count commands.",
	},
	costs: {
		section: "Evidence",
		title: "Costs",
		subtitle: () => "Model spend, burn rate, projection, and anomaly windows.",
		heroTitle: () =>
			"Cost visibility is part of the narrative workstation, not an afterthought.",
		heroBody: () =>
			"This page turns cost analytics into a calmer, more decision-oriented surface: current burn, which models dominate it, and where a budget alert should trigger follow-up.",
		metrics: (context) => [
			{
				label: "Today",
				value: `$${(context.sessionCount * 0.15).toFixed(2)}`,
				detail: "Estimated from session activity",
				tone: "green",
			},
			{
				label: "Month",
				value: `$${(context.sessionCount * 4.2).toFixed(0)}`,
				detail: "Projected monthly burn",
				tone: "blue",
			},
			{
				label: "Primary spend lane",
				value: "Codex",
				detail: "Default cost posture for the current shell phase",
				tone: "violet",
			},
			{
				label: "Active sessions",
				value: String(context.sessionCount),
				detail: "Contributing to total costs",
				tone: "amber",
			},
		],
		highlightsTitle: "Budget lenses",
		highlights: () => [
			{
				eyebrow: "Projection",
				title: "Budget drift before it hurts",
				body: "Make the forecast visible enough that spend questions can be answered without opening another tool.",
				tone: "blue",
			},
			{
				eyebrow: "Attribution",
				title: "Explain where spend came from",
				body: "Join cost spikes back to models, sessions, and operator workflows.",
				tone: "violet",
			},
			{
				eyebrow: "Intervention",
				title: "Suggest safer responses",
				body: "Recommend throttling, review, or provider shifts without performing them automatically.",
				tone: "amber",
			},
		],
		activityTitle: "Recent spend signals",
		activity: (context) => [
			...context.sessionExcerpts.slice(0, 3).map((s) => ({
				title: `${s.tool} session cost`,
				meta: `$${calculateDeterministicCost(s)}`,
				detail: `Spend attributed to ${s.messages.length} messages`,
				status: "info" as const,
			})),
			{
				title: "Budget threshold warning",
				meta: "Preview",
				detail: "Monthly projection is nearing configured soft cap",
				status: "warn",
			},
		],
		tableTitle: "Spend by model",
		tableColumns: ["Model", "Trend", "Operator response"],
		tableRows: (context) => {
			const tools = Array.from(
				new Set(context.sessionExcerpts.map((s) => s.tool)),
			).filter(Boolean);
			return [
				...tools.map((t) => ({
					primary: String(t),
					secondary: "Stable",
					tertiary: `Attributed to ${context.sessionExcerpts.filter((s) => s.tool === t).length} sessions`,
				})),
				{
					primary: "Legacy runs",
					secondary: "Archived",
					tertiary: "Historical context only",
				},
			].slice(0, 4);
		},
		footerNote: () =>
			"Cost clarity becomes more credible when each spike has a session and workflow explanation attached to it.",
	},
	setup: {
		section: "Workspace",
		title: "Setup",
		subtitle: () => "Environment, toolchain, and workspace bootstrap state.",
		heroTitle: (_context) =>
			"Understand your local setup before it causes friction.",
		heroBody: (_context) =>
			"Setup view keeps toolchain requirements, env file inventory, and workspace health in one glanceable surface.",
		metrics: (_context) => [
			{
				label: "Env files",
				value: "—",
				detail: "Checked at workspace load",
				tone: "blue",
				authorityTier: "live_repo" as const,
				authorityLabel: "Repo",
			},
			{
				label: "Toolchain",
				value: "—",
				detail: "Runtime version check",
				tone: "violet",
				authorityTier: "live_repo" as const,
				authorityLabel: "Repo",
			},
			{
				label: "Bootstrap status",
				value: "—",
				detail: "Install script health",
				tone: "green",
				authorityTier: "static_scaffold" as const,
				authorityLabel: "Scaffold",
			},
		],
		highlightsTitle: "Setup goals",
		highlights: () => [
			{
				eyebrow: "Toolchain",
				title: "Validate runtime dependencies",
				body: "Confirm all required tools and versions are installed before coding begins.",
				tone: "blue",
				authorityTier: "live_repo" as const,
				authorityLabel: "Repo",
			},
			{
				eyebrow: "Env",
				title: "Inventory missing secrets",
				body: "Catch missing .env files early to avoid silent failures during capture.",
				tone: "amber",
				authorityTier: "live_repo" as const,
				authorityLabel: "Repo",
			},
			{
				eyebrow: "Bootstrap",
				title: "Keep setup scripts honest",
				body: "One-command bootstrap should produce a working workspace every time.",
				tone: "violet",
				authorityTier: "static_scaffold" as const,
				authorityLabel: "Scaffold",
			},
		],
		activityTitle: "Setup checklist",
		activity: () => [
			{
				title: "Workspace ready",
				meta: "Now",
				detail: "All required setup checks passed",
				status: "ok" as const,
				authorityTier: "live_repo" as const,
				authorityLabel: "Repo",
			},
		],
		tableTitle: "Setup inventory",
		tableColumns: ["Item", "Status", "Detail"],
		tableRows: () => [
			{
				primary: "Bootstrap script",
				secondary: "OK",
				tertiary: "scripts/bootstrap.sh present",
				authorityTier: "live_repo" as const,
				authorityLabel: "Repo",
			},
		],
		footerNote: () =>
			"Setup clarity is a precondition for reliable capture and trustworthy narrative output.",
	},
	timeline: {
		section: "Evidence",
		title: "Timeline",
		subtitle: () =>
			"Commit rhythm, branch context, and narrative drill-down entry points.",
		heroTitle: () => "Move from chronology to comprehension.",
		heroBody: () =>
			"Timeline should be more than chronology. In Trace Narrative it becomes the bridge between operator context and narrative evidence.",
		metrics: (context) => [
			{
				label: "Commits indexed",
				value: `${context.commitCount}`,
				detail: "In the active repo context",
				tone: "blue",
			},
			{
				label: "Narrative-ready",
				value: "81%",
				detail: "Commits with summary + evidence",
				tone: "violet",
			},
			{
				label: "Linked sessions",
				value: `${context.sessionCount}`,
				detail: "Available for timeline jumps",
				tone: "green",
			},
			{
				label: "Review gaps",
				value: "3",
				detail: "Entries missing strong causal links",
				tone: "amber",
			},
		],
		highlightsTitle: "Timeline jobs",
		highlights: () => [
			{
				eyebrow: "Scan",
				title: "See the branch story at a glance",
				body: "Combine commit cadence, attribution, and linked sessions into a fast-reading vertical rhythm.",
				tone: "blue",
			},
			{
				eyebrow: "Explain",
				title: "Jump into why",
				body: "Every interesting timeline point should open the surrounding narrative, not just raw file lists.",
				tone: "violet",
			},
			{
				eyebrow: "Audit",
				title: "Expose weak joins",
				body: "Missing or low-confidence narrative links belong in the open, not behind perfect-looking badges.",
				tone: "amber",
			},
		],
		activityTitle: "Timeline moments",
		activity: (context) => [
			{
				title: "Active branch indexed",
				meta: "now",
				detail: `${context.commitCount} commits verified in ${context.repoName}`,
				status: "ok",
			},
			...context.sessionExcerpts.slice(0, 2).map((s) =>
				normalizeActivity({
					type: "Timeline",
					label: `${s.tool} link`,
					value: s.linkedCommitSha ? "Linked" : "Floating",
					description: s.linkedCommitSha
						? `Tied to ${s.linkedCommitSha?.slice(0, 7)}`
						: "Awaiting manual join",
					time: s.importedAtISO || "recently",
					authority: LIVE_CAPTURE_AUTHORITY,
				}),
			),
			{
				title: "Capture posture",
				meta: "Current",
				detail: context.trustLabel,
				status: context.trustState === "healthy" ? "ok" : "warn",
			},
		],
		tableTitle: "Drill-down paths",
		tableColumns: ["Entry point", "Narrative use", "Preferred landing"],
		tableRows: (context) =>
			[
				{
					primary: "Latest commit",
					secondary: context.repoName,
					tertiary: `Index of ${context.commitCount} verified entries`,
				},
				...context.sessionExcerpts
					.filter((s) => !!s.linkedCommitSha)
					.slice(0, 3)
					.map((s) => ({
						primary: `Session: ${s.tool}`,
						secondary: `Linked to ${s.linkedCommitSha?.slice(0, 7)}`,
						tertiary: "Explore narrative bridge",
					})),
				...(context.sessionExcerpts.filter((s) => !s.linkedCommitSha).length > 0
					? [
							{
								primary: "Unlinked traces",
								secondary: `${context.sessionExcerpts.filter((s) => !s.linkedCommitSha).length} floating`,
								tertiary: "Link sessions to commits for visibility",
							},
						]
					: []),
			].slice(0, 4),
		provenance: (context) => ({
			eyebrow: "Signature view",
			title: "Causal chain rail",
			summary:
				"Timeline becomes more useful when chronology is paired with a visible evidence chain: commit boundary, session join, cited evidence, then the causal claim we are willing to repeat.",
			footnote: context.sessionExcerpts.some(
				(session) => !session.linkedCommitSha,
			)
				? "Floating sessions should remain visible in the rail so a missing join is treated as part of the story, not hidden debt."
				: "Every visible step has at least one commit-linked session join in the current workspace slice.",
			nodes: [
				{
					eyebrow: "Observed",
					title: "Commit boundary",
					detail: `${context.commitCount} commits are indexed in the active repo window.`,
					state: "observed",
					tone: "blue",
					authorityTier: context.hasLiveRepoData
						? "live_repo"
						: "derived_summary",
					authorityLabel: context.hasLiveRepoData ? "Repo" : "Derived",
				},
				{
					eyebrow: "Joined",
					title: context.sessionExcerpts.some(
						(session) => session.linkedCommitSha,
					)
						? "Session evidence attached"
						: "Session join still pending",
					detail: context.sessionExcerpts.some(
						(session) => session.linkedCommitSha,
					)
						? "At least one session excerpt already lands on a commit boundary."
						: "No commit-linked session evidence is currently available in this timeline slice.",
					state: "linked",
					tone: context.sessionExcerpts.some(
						(session) => session.linkedCommitSha,
					)
						? "green"
						: "amber",
					edgeLabel: "explained by",
					action: { type: "navigate", mode: "sessions" },
				},
				{
					eyebrow: "Derived",
					title: context.narrative
						? "Evidence citation is ready"
						: "Citations still need grounding",
					detail:
						context.narrative?.evidenceLinks[0]?.label ??
						"Open Repo Evidence to confirm which citation best supports this branch story.",
					state: "derived",
					tone: context.narrative ? "violet" : "slate",
					edgeLabel: "cited as",
					action: context.narrative?.evidenceLinks[0]
						? {
								type: "open_evidence",
								evidenceId: context.narrative.evidenceLinks[0].id,
							}
						: { type: "navigate", mode: "repo" },
				},
				{
					eyebrow: "Review",
					title: "Causal claim",
					detail:
						context.trustState === "healthy"
							? "The timeline is ready for why-driven drill-down."
							: "Keep the claim soft until capture posture and joins recover.",
					state: "review",
					tone: context.trustState === "healthy" ? "green" : "red",
					edgeLabel: "repeated as",
					authorityTier:
						context.trustState === "healthy"
							? "derived_summary"
							: "system_signal",
					authorityLabel:
						context.trustState === "healthy" ? "Derived" : "Trust warning",
					action: {
						type: "navigate",
						mode: context.trustState === "healthy" ? "repo" : "hygiene",
					},
				},
			],
		}),
		footerNote: () =>
			"Timeline should remain a bridge surface: lightweight, fast, and one click away from deeper evidence.",
	},
	"repo-pulse": {
		section: "Workspace",
		title: "Workspace Pulse",
		subtitle: (context) =>
			context.narrative?.summary ||
			"Repo cleanliness, freshness, and things that quietly need attention.",
		heroTitle: (context) =>
			`${context.repoName} is only one pulse in the workspace.`,
		heroBody: () =>
			"This page helps the operator see which repos are quiet, drifting, or risky before those issues become interruptive.",
		metrics: (context) => [
			{
				label: "Repos watched",
				value: "1",
				detail: "Primary workspace connected",
				tone: "blue",
			},
			{
				label: "Dirty repos",
				value: context.changedFiles.length > 0 ? "1" : "0",
				detail:
					context.changedFiles.length > 0
						? "Uncommitted changes detected"
						: "No uncommitted changes detected",
				tone: context.changedFiles.length > 0 ? "amber" : "green",
			},
			{
				label: "Active story",
				value: String(context.commitCount),
				detail: "Commits in current branch",
				tone: "violet",
			},
			{
				label: "Linked context",
				value: String(context.sessionCount),
				detail: "Associated agent sessions",
				tone: "amber",
			},
		],
		highlightsTitle: "Pulse heuristics",
		highlights: (context) => [
			{
				eyebrow: "Narrative",
				title: "Contextual Summary",
				body:
					context.narrative?.summary ||
					"No narrative detected for this branch yet.",
				tone: "violet",
			},
			...(context.narrative?.highlights.map((h) => ({
				eyebrow: "Insight",
				title: h.title,
				body: h.whyThisMatters,
				tone: "blue" as SurfaceTone,
			})) || [
				{
					eyebrow: "Freshness",
					title: "What changed recently?",
					body: "Sort by recent commit activity to keep the workspace map aligned with actual attention.",
					tone: "blue",
				},
				{
					eyebrow: "Risk",
					title: "Where is drift hiding?",
					body: "Call out dirty or unpushed repos that look harmless until they block a later flow.",
					tone: "amber",
				},
			]),
		],
		activityTitle: "Repo status feed",
		activity: (context) => [
			{
				title: context.repoName,
				meta: context.hasLiveRepoData ? "active" : "preview",
				detail: context.hasLiveRepoData
					? `Indexed state with ${context.commitCount} commits and ${context.sessionCount} sessions.`
					: "Showing fallback preview for the workspace.",
				status: context.hasLiveRepoData ? "ok" : "warn",
			},
			{
				title: "coding-harness",
				meta: "clean",
				detail: "Recent rollout closure suggests no immediate action",
				status: "ok",
			},
			{
				title: "config/codex",
				meta: "ahead",
				detail: "Guardrail and automation changes pending review",
				status: "info",
			},
			{
				title: "otel-collector",
				meta: "watch",
				detail: "Telemetry hardening is still a shared dependency",
				status: "warn",
			},
		],
		tableTitle: "Pulse queue",
		tableColumns: ["Repo", "Current state", "Suggested move"],
		tableRows: (context) => [
			{
				primary: context.repoName,
				secondary: context.hasLiveRepoData ? "Ready" : "Preview",
				tertiary: context.hasLiveRepoData
					? "Everything indexed and summarized"
					: "Loading workspace context...",
			},
			{
				primary: "coding-harness",
				secondary: "Archived",
				tertiary: "Rollout pass was 2 days ago",
			},
			{
				primary: "config/codex",
				secondary: "Clean",
				tertiary: "No new guardrail drift detected",
			},
			{
				primary: "otel-collector",
				secondary: "Quiet",
				tertiary: "Last activity was 4h ago",
			},
		],
		footerNote: () =>
			"Repo pulse works best when it pushes the operator toward the right repo, not just a bigger list.",
	},
	diffs: {
		section: "Workspace",
		title: "Diffs",
		subtitle: () => "Session-linked file changes and high-churn surfaces.",
		heroTitle: () =>
			"Make file change review feel connected to the story, not detached from it.",
		heroBody: () =>
			"In Trace Narrative, the diff surface should become the evidence-centric companion to repo mode: changed files, linked sessions, and review hotspots.",
		metrics: (context) => [
			{
				label: "Changed files",
				value: String(context.changedFiles.length),
				detail: "Across the active review window",
				tone: "blue",
			},
			{
				label: "Session-linked",
				value: String(
					context.sessionExcerpts.filter((s) => !!s.linkedCommitSha).length,
				),
				detail: "Files with direct conversation context",
				tone: "violet",
			},
			{
				label: "Active traces",
				value: String(context.sessionCount),
				detail: "Providing narrative evidence",
				tone: "amber",
			},
			{
				label: "Drift churn",
				value: String(
					context.driftReport?.metrics.find((m) => m.id === "uncommitted_churn")
						?.value || 0,
				),
				detail: "Uncommitted churn (loc)",
				tone: context.driftReport?.status === "healthy" ? "green" : "amber",
			},
			{
				label: "Ready for review",
				value:
					context.changedFiles.length > 0
						? String(context.changedFiles.length)
						: "0",
				detail: "Sufficient evidence present",
				tone: "green",
			},
		],
		highlightsTitle: "Diff workflows",
		highlights: () => [
			{
				eyebrow: "Evidence",
				title: "Show the file and the reason",
				body: "A diff without nearby narrative evidence should feel obviously incomplete.",
				tone: "violet",
			},
			{
				eyebrow: "Heatmap",
				title: "Expose repeated churn",
				body: "Highlight files that are bouncing between tools, sessions, or branches.",
				tone: "amber",
			},
			{
				eyebrow: "Speed",
				title: "Keep review friction low",
				body: "Use this page for quick scan-and-open, then hand off to repo mode for deep reading.",
				tone: "blue",
			},
		],
		activityTitle: "Diff hotspots",
		activity: (context) => [
			...context.changedFiles.slice(0, 4).map((file) => ({
				title: file,
				meta: "local change",
				detail: "Touched in current workspace session",
				status: "ok" as const,
			})),
			...(context.changedFiles.length === 0
				? [
						{
							title: "No active diffs",
							meta: "Clean",
							detail: "Workspace matches branch head",
							status: "ok" as const,
						},
					]
				: []),
		],
		tableTitle: "File review queue",
		tableColumns: ["File", "Narrative state", "Why inspect"],
		tableRows: (context) => [
			...context.changedFiles.slice(0, 8).map((file) => {
				const isLinked = context.sessionExcerpts.some((s) =>
					s.messages.some((m) => m.text?.includes(file)),
				);
				const evidence = context.narrative?.evidenceLinks.find(
					(e) => e.filePath?.includes(file) || e.label.includes(file),
				);

				return {
					primary: file,
					secondary: isLinked ? "Linked" : "Metadata",
					tertiary: isLinked
						? "Referenced in session activity"
						: evidence
							? "Mentioned in narrative"
							: "Pending narrative verification",
					action: evidence
						? { type: "open_evidence" as const, evidenceId: evidence.id }
						: undefined,
				};
			}),
			...(context.changedFiles.length === 0
				? [
						{
							primary: "src/App.tsx",
							secondary: "Stable",
							tertiary: "Controls shell routing and view orchestration",
						},
						{
							primary: "src/ui/views/NarrativeSurfaceView.tsx",
							secondary: "Stable",
							tertiary: "Defines the updated operator surfaces",
						},
					]
				: []),
		],
		footerNote: () =>
			"Diffs page should reduce context-switch cost and make it obvious when repo mode is the right next step.",
	},
	worktrees: {
		section: "Workspace",
		title: "Worktrees",
		subtitle: () => "Branch isolation, detached states, and workspace sprawl.",
		heroTitle: () => "See every active worktree before it surprises you.",
		heroBody: () =>
			"This view helps the operator catch detached, stale, or oversized worktrees before they turn into cleanup debt.",
		metrics: () => [
			{
				label: "Worktrees",
				value: "7",
				detail: "Tracked across active repos",
				tone: "blue",
			},
			{
				label: "Detached",
				value: "1",
				detail: "Requires deliberate action",
				tone: "amber",
			},
			{
				label: "Dirty",
				value: "3",
				detail: "Uncommitted changes present",
				tone: "violet",
			},
			{ label: "Safe", value: "3", detail: "Merged and clean", tone: "green" },
		],
		highlightsTitle: "Worktree checks",
		highlights: () => [
			{
				eyebrow: "Safety",
				title: "Delete only with confidence",
				body: "Keep deletion cues behind clean, merged, no-stash rules and visible risk notes.",
				tone: "amber",
			},
			{
				eyebrow: "Context",
				title: "Branch intent stays visible",
				body: "Show what each worktree is for so cleanup decisions remain grounded.",
				tone: "blue",
			},
			{
				eyebrow: "Scale",
				title: "Spot workspace sprawl",
				body: "Track size and age so forgotten worktrees do not keep accumulating silently.",
				tone: "violet",
			},
		],
		activityTitle: "Worktree watchlist",
		activity: () => [
			{
				title: "feature/narrative-surfaces",
				meta: "dirty",
				detail: "Active UI pass across shell and view routing",
				status: "warn",
			},
			{
				title: "main",
				meta: "clean",
				detail: "Safe fallback for verification and comparison",
				status: "ok",
			},
			{
				title: "release/snapshot",
				meta: "detached",
				detail: "Needs review before any cleanup action",
				status: "critical",
			},
			{
				title: "telemetry-lane",
				meta: "clean",
				detail: "Useful for isolated reliability experiments",
				status: "info",
			},
		],
		tableTitle: "Worktree inventory",
		tableColumns: ["Worktree", "Status", "Operator advice"],
		tableRows: () => [
			{
				primary: "feature/narrative-surfaces",
				secondary: "Dirty",
				tertiary: "Continue implementation and validate before prune",
			},
			{
				primary: "main",
				secondary: "Clean",
				tertiary: "Use as stable comparison point",
			},
			{
				primary: "release/snapshot",
				secondary: "Detached",
				tertiary: "Do not delete until intent is confirmed",
			},
			{
				primary: "telemetry-lane",
				secondary: "Clean",
				tertiary: "Keep for reliability verification",
			},
		],
		footerNote: () =>
			"Worktrees page should be operationally conservative: more guardrails, fewer tempting destructive actions.",
	},
	hygiene: {
		section: "Health",
		title: "Hygiene",
		subtitle: () =>
			"Trust, environment, setup, and live capture follow-through in one lane.",
		heroTitle: () => "Keep the operational cleanup path in one place.",
		heroBody: (context) =>
			`Hygiene is the merged review lane for ${context.repoName}: trust posture, env drift, setup readiness, and live capture all stay reachable without turning each check into a separate top-level destination.`,
		metrics: (context) => [
			{
				label: "Trust posture",
				value: context.trustState === "healthy" ? "Ready" : "Review",
				detail: context.trustLabel,
				tone: context.trustState === "healthy" ? "green" : "amber",
			},
			{
				label: "Env coverage",
				value: "Mostly safe",
				detail: "Gitignore and template posture stay in view",
				tone: "blue",
			},
			{
				label: "Setup readiness",
				value: "Tracked",
				detail: "Imports and capture setup remain one click away",
				tone: "violet",
			},
			{
				label: "Live capture",
				value:
					context.captureReliabilityMode === "HYBRID_ACTIVE"
						? "Healthy"
						: context.captureReliabilityMode === "OTEL_ONLY"
							? "Baseline"
							: "Degraded",
				detail: "Keep capture posture visible before cleanup or handoff",
				tone: context.trustState === "healthy" ? "green" : "amber",
			},
		],
		highlightsTitle: "Hygiene checks",
		highlights: () => [
			{
				eyebrow: "Trust",
				title: "Start with what is safe to believe",
				body: "Trust review stays first because every other operational cleanup depends on narrative confidence.",
				tone: "amber",
			},
			{
				eyebrow: "Environment",
				title: "Keep config drift bounded",
				body: "Env review belongs here so sensitive hygiene stays visible without becoming a separate shell destination.",
				tone: "blue",
			},
			{
				eyebrow: "Capture",
				title: "Live posture still matters",
				body: "A healthy cleanup lane should make it obvious when capture must be repaired before anything is declared stable.",
				tone: "violet",
			},
		],
		activityTitle: "Hygiene overview",
		activity: (context) => [
			{
				title: "Trust Center",
				meta: context.trustState === "healthy" ? "ready" : "review",
				detail:
					context.trustState === "healthy"
						? "Capture posture is good enough for normal evidence review"
						: "Resolve trust posture before cleanup or handoff",
				status: context.trustState === "healthy" ? "ok" : "warn",
			},
			{
				title: "Env hygiene",
				meta: "steady",
				detail: "Config coverage stays bounded without exposing raw values",
				status: "info",
			},
			{
				title: "Setup review",
				meta: "available",
				detail:
					"Import and capture readiness remain accessible when onboarding drifts",
				status: "ok",
			},
			{
				title: "Live capture",
				meta:
					context.captureReliabilityMode === "HYBRID_ACTIVE"
						? "healthy"
						: "watch",
				detail: "Use Live Capture when the trust lane needs corroboration",
				status: context.trustState === "healthy" ? "info" : "warn",
			},
		],
		tableTitle: "Operational lanes",
		tableColumns: ["Surface", "Current posture", "Next move"],
		tableRows: (context) => [
			{
				primary: "Trust Center",
				secondary: context.trustState === "healthy" ? "Ready" : "Review",
				tertiary:
					context.trustState === "healthy"
						? "Open trust details only when posture changes"
						: "Review trust signals before cleanup or promotion",
			},
			{
				primary: "Env hygiene",
				secondary: "Bounded",
				tertiary: "Inspect config drift and example coverage in this lane",
			},
			{
				primary: "Setup",
				secondary: "Available",
				tertiary:
					"Revisit onboarding and capture readiness without leaving the lane",
			},
			{
				primary: "Live capture",
				secondary:
					context.captureReliabilityMode === "HYBRID_ACTIVE"
						? "Healthy"
						: "Needs review",
				tertiary: "Keep capture posture visible here before handoff or cleanup",
			},
		],
		footerNote: () =>
			"Hygiene should feel like one operational lane with four focused subpanels, not four competing shell destinations.",
	},
	env: {
		section: "Health",
		title: "Env Files",
		subtitle: () =>
			"Environment file hygiene, gitignore coverage, and example parity.",
		heroTitle: () => "Config hygiene deserves its own visibility.",
		heroBody: () =>
			"Env-file inspection matters because these files shape trust and safety. This page keeps the signal focused on coverage, examples, and avoidable leakage risks.",
		metrics: () => [
			{
				label: "Env files",
				value: "9",
				detail: "Detected across tracked repos",
				tone: "blue",
			},
			{
				label: "Ignored safely",
				value: "7",
				detail: "Covered by gitignore patterns",
				tone: "green",
			},
			{
				label: "Needs example",
				value: "2",
				detail: "Missing companion docs or templates",
				tone: "amber",
			},
			{
				label: "Leak risk",
				value: "Low",
				detail: "No critical exposures in current sample",
				tone: "violet",
			},
		],
		highlightsTitle: "Env hygiene goals",
		highlights: () => [
			{
				eyebrow: "Coverage",
				title: "Know which env files exist",
				body: "Inventory alone helps the operator reason about risk and onboarding gaps.",
				tone: "blue",
			},
			{
				eyebrow: "Examples",
				title: "Promote safer defaults",
				body: "Missing example files are small issues that create bigger setup inconsistency later.",
				tone: "amber",
			},
			{
				eyebrow: "Safety",
				title: "Keep sensitive paths out of summaries",
				body: "Show counts and posture without leaking secrets or raw values.",
				tone: "violet",
			},
		],
		activityTitle: "Env checks",
		activity: () => [
			{
				title: ".env.local",
				meta: "ignored",
				detail: "Safe posture for local overrides",
				status: "ok",
			},
			{
				title: ".env.example",
				meta: "missing",
				detail: "One repo still needs a better onboarding template",
				status: "warn",
			},
			{
				title: "Gitignore coverage",
				meta: "good",
				detail: "Most known env lanes are protected",
				status: "ok",
			},
			{
				title: "Variable audit",
				meta: "quiet",
				detail: "No need to surface raw names in this UI",
				status: "info",
			},
		],
		tableTitle: "Env hygiene queue",
		tableColumns: ["Surface", "Current posture", "Suggested response"],
		tableRows: () => [
			{
				primary: "Local overrides",
				secondary: "Ignored",
				tertiary: "Keep out of telemetry and UI surfaces",
			},
			{
				primary: "Example templates",
				secondary: "Partial",
				tertiary: "Add examples where onboarding is weak",
			},
			{
				primary: "Gitignore coverage",
				secondary: "Mostly good",
				tertiary: "Patch the last uncovered patterns",
			},
			{
				primary: "Docs references",
				secondary: "Needs clarity",
				tertiary: "Point setup view to env expectations",
			},
		],
		footerNote: () =>
			"Env page should reinforce safe defaults without turning into a secret browser.",
	},
	settings: {
		section: "Configure",
		title: "Settings",
		subtitle: () =>
			"Scan roots, Codex capture defaults, budgets, and app behavior.",
		heroTitle: () =>
			"Settings should explain the operator contract, not just expose switches.",
		heroBody: () =>
			"Settings are a broad control surface, but the emphasis stays on why each setting affects trust, capture, or operator workload.",
		metrics: () => [
			{
				label: "Scan roots",
				value: "3",
				detail: "Active workspace directories",
				tone: "blue",
			},
			{
				label: "Data sources",
				value: "Codex-first",
				detail:
					"Other providers stay staged until the shell narrative is stable",
				tone: "violet",
			},
			{
				label: "Budgets",
				value: "Configured",
				detail: "Daily and monthly caps visible",
				tone: "green",
			},
			{
				label: "Drift risk",
				value: "Low",
				detail: "Settings look aligned with current flows",
				tone: "amber",
			},
		],
		highlightsTitle: "Settings priorities",
		highlights: () => [
			{
				eyebrow: "Scope",
				title: "Let users understand scan boundaries",
				body: "Scan roots and source toggles should make it obvious what data the app can and cannot see.",
				tone: "blue",
			},
			{
				eyebrow: "Trust",
				title: "Settings affect interpretation",
				body: "When sources are disabled, other narrative surfaces should reflect that honestly.",
				tone: "amber",
			},
			{
				eyebrow: "Cost",
				title: "Budgeting belongs here",
				body: "Operator budgets and warnings are part of sustainable usage, not buried secondary preferences.",
				tone: "violet",
			},
		],
		activityTitle: "Recent setting notes",
		activity: () => [
			{
				title: "Codex source enabled",
				meta: "Current",
				detail: "Needed for richer session and cost visibility",
				status: "ok",
			},
			{
				title: "Budget thresholds set",
				meta: "Current",
				detail: "Soft warnings help costs stay understandable",
				status: "info",
			},
			{
				title: "Auto-scan scope review",
				meta: "Suggested",
				detail: "Keep roots explicit as workspace breadth grows",
				status: "warn",
			},
			{
				title: "Provider expansion held",
				meta: "Watch",
				detail:
					"Do not broaden sources until Codex-first trust is working cleanly",
				status: "critical",
			},
		],
		tableTitle: "Setting groups",
		tableColumns: ["Group", "Why it matters", "Current note"],
		tableRows: () => [
			{
				primary: "Scan directories",
				secondary: "Determines workspace visibility",
				tertiary: "Keep minimal and intentional",
			},
			{
				primary: "Source toggles",
				secondary: "Affects session and dashboard truth",
				tertiary: "Reflect disabled sources clearly",
			},
			{
				primary: "Budgets",
				secondary: "Controls cost behavior",
				tertiary: "Good candidate for alerting tie-ins",
			},
			{
				primary: "Update behavior",
				secondary: "Controls operator interruption",
				tertiary: "Stay quiet unless action matters",
			},
		],
		footerNote: () =>
			"Settings page should make the app feel legible and controllable, not over-configured.",
	},
	status: {
		section: "Health",
		title: "Trust Center",
		subtitle: () =>
			"Codex capture health, authority boundaries, and the next safe recovery move.",
		heroTitle: () => "Make trust visible, legible, and actionable.",
		heroBody: (context) =>
			`This page gathers the trust signals that affect every other narrative surface in ${context.repoName}: Codex capture posture, evidence joins, authority boundaries, and whether recent failures need explicit follow-up before the story is trusted.`,
		metrics: (context) => [
			{
				label: "Evidence posture",
				value: context.trustState === "healthy" ? "Grounded" : "Caution",
				detail: context.trustLabel,
				tone: context.trustState === "healthy" ? "green" : "amber",
			},
			{
				label: "Codex capture",
				value:
					context.captureReliabilityMode === "HYBRID_ACTIVE"
						? "Hybrid"
						: context.captureReliabilityMode === "OTEL_ONLY"
							? "Baseline"
							: "Degraded",
				detail:
					"Provider expansion stays secondary until this lane is trustworthy",
				tone: context.trustState === "healthy" ? "blue" : "amber",
			},
			{
				label: "Authority boundary",
				value: "Fail-closed",
				detail: "No privileged action should outrun its runtime check",
				tone: "violet",
			},
			{
				label: "Next safe move",
				value:
					context.trustState === "healthy"
						? "Inspect evidence"
						: "Review capture",
				detail:
					context.trustState === "healthy"
						? "Repo Evidence and Live Capture can be trusted as-is"
						: "Use Live Capture and Settings before trusting derived claims or attribution",
				tone: context.trustState === "healthy" ? "green" : "amber",
			},
		],
		highlightsTitle: "Trust principles",
		highlights: () => [
			{
				eyebrow: "Clarity",
				title: "Separate degraded from broken",
				body: "A trust overlay is not the same thing as a total system failure, and the UI should not blur the two.",
				tone: "blue",
			},
			{
				eyebrow: "Codex first",
				title: "Protect the initial provider lane",
				body: "Before adding more providers, make sure Codex capture, linking, and recovery cues are dependable.",
				tone: "violet",
			},
			{
				eyebrow: "Recovery",
				title: "Make next actions explicit",
				body: "If capture is degraded, show what changed, what is still safe to inspect, and which surface should be opened next.",
				tone: "amber",
			},
		],
		activityTitle: "Recent trust events",
		activity: (context) => [
			{
				title: "Capture posture",
				meta: "Now",
				detail: context.trustLabel,
				status: context.trustState === "healthy" ? "ok" : "warn",
			},
			{
				title: "Codex session ingest",
				meta: "Now",
				detail:
					context.sessionCount > 0
						? `${context.sessionCount} sessions available for trust-aware evidence`
						: "No imported Codex sessions yet",
				status: context.sessionCount > 0 ? "info" : "warn",
			},
			{
				title: "Authority boundary",
				meta: "Recent",
				detail: "No broadening beyond the approved Codex-first shell contract",
				status: "ok",
			},
			{
				title: "Dropped request record",
				meta: "Recent",
				detail:
					"Stale responses were ignored instead of mutating the active narrative state",
				status: "warn",
			},
		],
		tableTitle: "Trust matrix",
		tableColumns: ["Surface", "Current state", "Operator action"],
		tableRows: (context) => [
			{
				primary: "Capture reliability",
				secondary: context.trustState === "healthy" ? "Healthy" : "Degraded",
				tertiary:
					context.trustState === "healthy"
						? "Safe to inspect evidence normally"
						: "Open Live Capture and Settings before trusting derived claims",
			},
			{
				primary: "Repo evidence joins",
				secondary:
					context.unlinkedSessionCount === 0
						? "Linked"
						: `${context.unlinkedSessionCount} floating`,
				tertiary:
					context.unlinkedSessionCount === 0
						? "Narrative links are grounded"
						: "Link floating sessions before over-reading attribution or intent",
			},
			{
				primary: "Command authority",
				secondary: "Fail-closed",
				tertiary: "Keep new routes behind explicit capability checks",
			},
			{
				primary: "Dropped requests",
				secondary: "Bounded",
				tertiary: "Inspect only when the count climbs",
			},
		],
		provenance: (context) => ({
			eyebrow: "Signature view",
			title: "Trust decision rail",
			summary:
				"Trust Center should show what must be true before a narrative claim becomes safe to repeat: capture posture, evidence joins, authority boundary, then the next safe operator move.",
			footnote:
				context.trustState === "healthy"
					? "The rail currently ends in an inspectable evidence action rather than a stop condition."
					: "The rail ends in a verification gate so degraded trust cannot masquerade as routine work.",
			nodes: [
				{
					eyebrow: "Observed",
					title:
						context.trustState === "healthy"
							? "Capture posture is grounded"
							: "Capture posture is degraded",
					detail: context.trustLabel,
					state: "observed",
					tone: context.trustState === "healthy" ? "green" : "amber",
					authorityTier: context.trustAuthority.authorityTier,
					authorityLabel: context.trustAuthority.authorityLabel,
				},
				{
					eyebrow: "Joined",
					title:
						context.unlinkedSessionCount === 0
							? "Evidence joins hold"
							: "Evidence joins are incomplete",
					detail:
						context.unlinkedSessionCount === 0
							? "Session evidence currently lands on commits or files."
							: `${context.unlinkedSessionCount} floating session${context.unlinkedSessionCount === 1 ? "" : "s"} should be linked before trusting attribution-heavy claims.`,
					state: "linked",
					tone: context.unlinkedSessionCount === 0 ? "green" : "amber",
					edgeLabel: "depends on",
					action: { type: "navigate", mode: "sessions" },
				},
				{
					eyebrow: "Derived",
					title: "Authority gate stays fail-closed",
					detail:
						"Runtime checks still decide whether privileged actions are actually allowed.",
					state: "derived",
					tone: "violet",
					edgeLabel: "bounded by",
					authorityTier: "derived_summary",
					authorityLabel: "Shell contract",
				},
				{
					eyebrow: "Review",
					title:
						context.trustState === "healthy"
							? "Open repo evidence"
							: "Review capture first",
					detail:
						context.trustState === "healthy"
							? "The next safe move is deeper evidence inspection."
							: "Use Live Capture or Settings before promoting derived claims into operator truth.",
					state: "review",
					tone: context.trustState === "healthy" ? "green" : "red",
					edgeLabel: "permits",
					authorityTier:
						context.trustState === "healthy" ? "live_repo" : "system_signal",
					authorityLabel:
						context.trustState === "healthy" ? "Evidence ready" : "Gate active",
					action: {
						type: "navigate",
						mode: context.trustState === "healthy" ? "repo" : "hygiene",
					},
				},
			],
		}),
		footerNote: () =>
			"Trust Center should help the operator decide what is safe to believe right now, what still needs verification, and where to go next to close the gap.",
	},
};

export function buildNarrativeSurfaceViewModel(
	mode: NarrativeSurfaceRegistryMode,
	repoState: RepoState,
	captureReliabilityStatus?: CaptureReliabilityStatus | null,
	autoIngestEnabled?: boolean,
): NarrativeSurfaceViewModel {
	const context = buildContext(
		repoState,
		captureReliabilityStatus,
		autoIngestEnabled,
	);
	const definition = surfaceDefinitions[mode];
	const provenance = definition.provenance?.(context);

	return {
		mode,
		section: definition.section,
		title: definition.title,
		subtitle: definition.subtitle(context),
		heroTitle: definition.heroTitle(context),
		heroBody: definition.heroBody(context),
		heroAuthorityTier: context.trustAuthority.authorityTier,
		heroAuthorityLabel: context.trustAuthority.authorityLabel,
		trustState: context.trustState,
		metrics: definition
			.metrics(context)
			.map((metric) => normalizeMetric(metric, context)),
		highlightsTitle: definition.highlightsTitle,
		highlights: definition
			.highlights(context)
			.map((highlight) => normalizeHighlight(highlight, context)),
		activityTitle: definition.activityTitle,
		activity: definition
			.activity(context)
			.map((activityItem) => normalizeActivityItem(activityItem, context)),
		tableTitle: definition.tableTitle,
		tableColumns: definition.tableColumns,
		tableRows: definition
			.tableRows(context)
			.map((row) => normalizeTableRow(row, context)),
		provenance: provenance
			? {
					...provenance,
					nodes: provenance.nodes.map((node) =>
						normalizeProvenanceNode(node, context),
					),
				}
			: undefined,
		footerNote: definition.footerNote(context),
		driftReport: context.driftReport,
	};
}
