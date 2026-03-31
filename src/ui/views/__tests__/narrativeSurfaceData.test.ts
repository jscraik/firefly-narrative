import { describe, expect, it } from "vitest";
import type { CaptureReliabilityStatus } from "../../../core/tauri/ingestConfig";
import type {
	BranchViewModel,
	DataAuthorityTier,
	SurfaceMode,
} from "../../../core/types";
import type { RepoState } from "../../../hooks/useRepoLoader";
import { buildNarrativeSurfaceViewModel } from "../narrativeSurfaceData";

function createRepoState(): RepoState {
	return {
		status: "ready",
		path: "/Users/jamiecraik/dev/trace-narrative",
		repo: {
			repoId: 42,
			root: "/Users/jamiecraik/dev/trace-narrative",
			branch: "main",
			headSha: "abc123",
		},
		model: {
			source: "git",
			title: "trace-narrative",
			status: "open",
			description: "Trace Narrative workspace",
			stats: {
				added: 0,
				removed: 0,
				files: 0,
				commits: 0,
				prompts: 0,
				responses: 0,
			},
			intent: [],
			timeline: [
				{ id: "c1", type: "commit", label: "Commit 1" },
				{ id: "c2", type: "commit", label: "Commit 2" },
			],
			sessionExcerpts: [
				{
					id: "s1",
					tool: "codex",
					messages: [
						{ id: "m1", role: "user", text: "Investigate surface routing" },
					],
				},
			],
			dirtyFiles: [],
			snapshots: [],
			meta: {
				repoId: 42,
				repoPath: "/Users/jamiecraik/dev/trace-narrative",
				branchName: "main",
				headSha: "abc123",
			},
		} as BranchViewModel,
	};
}

function createCaptureReliabilityStatus(
	overrides: Partial<CaptureReliabilityStatus> = {},
): CaptureReliabilityStatus {
	return {
		mode: "HYBRID_ACTIVE",
		otelBaselineHealthy: true,
		streamExpected: true,
		streamHealthy: true,
		reasons: [],
		metrics: {
			streamEventsAccepted: 12,
			streamEventsDuplicates: 0,
			streamEventsDropped: 0,
			streamEventsReplaced: 0,
		},
		transitions: [],
		appServer: {
			state: "running",
			initialized: true,
			initializeSent: true,
			authState: "authenticated",
			authMode: "device_code",
			streamHealthy: true,
			streamKillSwitch: false,
			restartBudget: 3,
			restartAttemptsInWindow: 0,
		},
		...overrides,
	};
}

const ALL_SURFACE_MODES: SurfaceMode[] = [
	"sessions",
	"tools",
	"hygiene",
	"settings",
];

const ALLOWED_AUTHORITY_TIERS = new Set<DataAuthorityTier>([
	"live_repo",
	"live_capture",
	"derived_summary",
	"static_scaffold",
	"system_signal",
]);

describe("buildNarrativeSurfaceViewModel", () => {
	it.each(
		ALL_SURFACE_MODES,
	)('mode "%s" keeps authority metadata populated across the shared surface', (mode) => {
		const model = buildNarrativeSurfaceViewModel(
			mode,
			createRepoState(),
			createCaptureReliabilityStatus(),
		);

		expect(ALLOWED_AUTHORITY_TIERS.has(model.heroAuthorityTier)).toBe(true);
		expect(model.heroAuthorityLabel.length).toBeGreaterThan(0);
		expect(["healthy", "degraded"]).toContain(model.trustState);
		expect(model.metrics.length).toBeGreaterThan(0);
		expect(model.highlights.length).toBeGreaterThan(0);
		expect(model.activity.length).toBeGreaterThan(0);
		expect(model.tableRows.length).toBeGreaterThan(0);

		for (const metric of model.metrics) {
			expect(ALLOWED_AUTHORITY_TIERS.has(metric.authorityTier)).toBe(true);
			expect(metric.authorityLabel).toBeTruthy();
		}
	});

	it("maps OTEL_ONLY reliability to derived-summary authority cues", () => {
		const model = buildNarrativeSurfaceViewModel(
			"hygiene",
			createRepoState(),
			createCaptureReliabilityStatus({
				mode: "OTEL_ONLY",
				otelBaselineHealthy: true,
			}),
		);

		expect(model.trustState).toBe("healthy");
		expect(model.heroAuthorityTier).toBe("derived_summary");
		expect(model.heroAuthorityLabel).toBe("OTEL");
	});

	it("marks unknown capture modes as degraded trust with captured-source authority", () => {
		const unknownModeReliabilityStatus = createCaptureReliabilityStatus({
			mode: "NONSENSE_MODE" as CaptureReliabilityStatus["mode"],
		});
		const model = buildNarrativeSurfaceViewModel(
			"hygiene",
			createRepoState(),
			unknownModeReliabilityStatus,
		);

		expect(model.trustState).toBe("degraded");
		expect(model.heroAuthorityTier).toBe("live_capture");
		expect(model.heroAuthorityLabel).toBe("Live");
	});

	describe("routing boundary", () => {
		const ANCHOR_MODES = ["dashboard", "repo"] as const;

		it("ALL_SURFACE_MODES does not include any anchor mode", () => {
			for (const anchor of ANCHOR_MODES) {
				expect((ALL_SURFACE_MODES as string[]).includes(anchor)).toBe(false);
			}
		});

		it("ALL_SURFACE_MODES covers the full non-anchor Mode union", () => {
			expect(ALL_SURFACE_MODES).toHaveLength(4);
		});
	});

	it("still evaluates drift report data for shared surfaces when repo state is ready", () => {
		const model = buildNarrativeSurfaceViewModel(
			"hygiene",
			createRepoState(),
			createCaptureReliabilityStatus(),
		);

		expect(model.driftReport).toBeDefined();
		expect(model.driftReport?.metrics.length).toBeGreaterThan(0);
	});
});
