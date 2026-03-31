import type {
	AttributionPrefs,
	AttributionPrefsUpdate,
} from "../../../core/attribution-api";
import type {
	CaptureReliabilityStatus,
	CollectorMigrationStatus,
	DiscoveredSources,
	IngestConfig,
	OtlpKeyStatus,
} from "../../../core/tauri/ingestConfig";
import type {
	GitHubContextState,
	SessionExcerpt,
	TestRun,
	TraceCollectorConfig,
	TraceCollectorStatus,
	TraceCommitSummary,
	TraceRange,
} from "../../../core/types";

export type TabId = "session" | "attribution" | "atlas" | "settings" | "tests";
export type TabCategory = "analyze" | "tools" | "config";
export type VerificationMode =
	| "evidence-first"
	| "session-first"
	| "diff-first";
export type VerificationModeReason =
	| "attribution"
	| "validation"
	| "session"
	| "fallback"
	| "kill-switch"
	| "low-confidence";

export type VerificationModeInput = {
	hasSessionContent: boolean;
	hasEvidenceContent: boolean;
	hasValidationContent: boolean;
	killSwitchActive?: boolean;
	lowConfidence?: boolean;
};

export function resolveVerificationModeState(input: VerificationModeInput): {
	mode: VerificationMode;
	reason: VerificationModeReason;
} {
	if (input.killSwitchActive) {
		return { mode: "diff-first", reason: "kill-switch" };
	}

	if (input.hasEvidenceContent) {
		return { mode: "evidence-first", reason: "attribution" };
	}

	if (input.hasValidationContent) {
		return { mode: "evidence-first", reason: "validation" };
	}

	if (input.hasSessionContent) {
		return { mode: "session-first", reason: "session" };
	}

	if (input.lowConfidence) {
		return { mode: "diff-first", reason: "low-confidence" };
	}

	return { mode: "diff-first", reason: "fallback" };
}

export interface TabConfig {
	id: TabId;
	label: string;
	shortLabel: string;
	iconName: "message" | "activity" | "search" | "tests" | "settings";
	category: TabCategory;
}

export const TABS: TabConfig[] = [
	{
		id: "session",
		label: "Session",
		shortLabel: "Session",
		iconName: "message",
		category: "analyze",
	},
	{
		id: "attribution",
		label: "AI Attribution",
		shortLabel: "Attribution",
		iconName: "activity",
		category: "analyze",
	},
	{
		id: "atlas",
		label: "Atlas Search",
		shortLabel: "Atlas",
		iconName: "search",
		category: "tools",
	},
	{
		id: "tests",
		label: "Tests",
		shortLabel: "Tests",
		iconName: "tests",
		category: "tools",
	},
	{
		id: "settings",
		label: "Settings",
		shortLabel: "Settings",
		iconName: "settings",
		category: "config",
	},
];

export const TAB_ACTIVE_STYLES: Record<TabId, string> = {
	session: "border-accent-violet-light bg-accent-violet-bg text-accent-violet",
	attribution: "border-accent-green-light bg-accent-green-bg text-accent-green",
	atlas: "border-accent-blue-light bg-accent-blue-bg text-accent-blue",
	tests: "border-accent-amber-light bg-accent-amber-bg text-accent-amber",
	settings: "border-border-light bg-bg-tertiary text-text-secondary",
};

export interface RightPanelTabsProps {
	branchScopeKey?: string;
	verificationMode?: VerificationMode;
	sessionExcerpts?: SessionExcerpt[];
	selectedFile: string | null;
	onFileClick: (path: string) => void;
	onUnlinkSession?: (sessionId: string) => void;
	onCommitClick: (commitSha: string) => void;
	selectedCommitId: string | null;
	repoRoot?: string;
	changedFiles?: string[];

	traceSummary?: TraceCommitSummary;
	traceStatus?: TraceCollectorStatus;
	hasFiles: boolean;
	onExportAgentTrace?: () => void;
	onRunOtlpSmokeTest?: () => void;

	traceConfig?: TraceCollectorConfig;
	onUpdateCodexOtelPath?: (path: string) => void;
	onToggleCodexOtelReceiver?: (enabled: boolean) => void;
	onOpenCodexOtelDocs?: () => void;
	codexPromptExport?: { enabled: boolean | null; configPath: string | null };
	attributionPrefs?: AttributionPrefs | null;
	onUpdateAttributionPrefs?: (update: AttributionPrefsUpdate) => void;
	onPurgeAttributionMetadata?: () => void;
	ingestConfig?: IngestConfig | null;
	otlpKeyStatus?: OtlpKeyStatus | null;
	discoveredSources?: DiscoveredSources | null;
	collectorMigrationStatus?: CollectorMigrationStatus | null;
	captureReliabilityStatus?: CaptureReliabilityStatus | null;
	onToggleAutoIngest?: (enabled: boolean) => void;
	onUpdateWatchPaths?: (paths: {
		claude: string[];
		cursor: string[];
		codexLogs: string[];
	}) => void;
	onMigrateCollector?: (dryRun?: boolean) => Promise<unknown>;
	onRollbackCollector?: () => Promise<unknown>;
	onRefreshCaptureReliability?: () => Promise<unknown>;
	onConfigureCodex?: () => void;
	onRotateOtlpKey?: () => void;
	onGrantCodexConsent?: () => void;
	onAuthorizeCodexAppServerForLiveTest?: () => Promise<void>;
	onLogoutCodexAppServerAccount?: () => Promise<void>;
	githubConnectorEnabled?: boolean;
	onToggleGitHubConnector?: (enabled: boolean) => void;
	githubConnectorState?: GitHubContextState;

	testRun?: TestRun;
	onTestFileClick: (path: string) => void;
	loadingTests?: boolean;
	onImportJUnit?: () => void;

	selectedCommitSha: string | null;
	repoId?: number;
	indexedCommitShas?: string[] | null;
	diffText: string | null;
	loadingDiff: boolean;
	traceRanges: TraceRange[];

	fireflyEnabled?: boolean;
	onToggleFirefly?: (enabled: boolean) => void;
}
