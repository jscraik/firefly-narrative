import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@design-studio/tokens", () => ({
	useTheme: () => ({ colorScheme: "dark", theme: "system" }),
}));

import type { CaptureReliabilityStatus } from "../../../core/tauri/ingestConfig";
import type { BranchViewModel } from "../../../core/types";
import type { RepoState } from "../../../hooks/useRepoLoader";
import { NarrativeSurfaceView } from "../NarrativeSurfaceView";

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

function renderSurface(
	mode: "sessions" | "tools" | "hygiene" | "settings",
	captureReliabilityStatus = createCaptureReliabilityStatus(),
	repoRoot = "",
) {
	return render(
		<NarrativeSurfaceView
			mode={mode}
			repoState={createRepoState()}
			captureReliabilityStatus={captureReliabilityStatus}
			onModeChange={vi.fn()}
			onOpenRepo={vi.fn()}
			onImportSession={vi.fn()}
			repoRoot={repoRoot}
		/>,
	);
}

describe("NarrativeSurfaceView", () => {
	it("renders Hygiene as the merged operational lane", () => {
		renderSurface("hygiene");

		expect(
			screen.getAllByRole("heading", { name: "Hygiene" }).length,
		).toBeGreaterThan(0);
		expect(screen.getByText("Hygiene overview")).toBeInTheDocument();
		expect(screen.getByText("Operational lanes")).toBeInTheDocument();
		expect(screen.getAllByText("Trust Center").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Env hygiene").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Setup").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Live capture").length).toBeGreaterThan(0);
	});

	it("renders Sessions as a dedicated evidence review surface", () => {
		renderSurface("sessions");

		expect(
			screen.getAllByRole("heading", { name: "Sessions" }).length,
		).toBeGreaterThan(0);
		expect(
			screen.getByText("History of interactive traces and captures"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Recent Sessions" }),
		).toBeInTheDocument();
		expect(screen.getByText("Review Window")).toBeInTheDocument();
		expect(screen.queryByText("{viewModel.subtitle}")).not.toBeInTheDocument();
	});

	it("renders Tools as a dedicated integrations surface", () => {
		renderSurface("tools");

		expect(
			screen.getAllByRole("heading", { name: "Tools" }).length,
		).toBeGreaterThan(0);
		expect(
			screen.getByText(
				"Usage mix, failure hotspots, and most-edited files across sessions.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Tool Distribution" }),
		).toBeInTheDocument();
		expect(screen.queryByText("{viewModel.subtitle}")).not.toBeInTheDocument();
	});

	it("renders Settings with embedded docs access", () => {
		renderSurface("settings", createCaptureReliabilityStatus(), "");

		expect(
			screen.getByRole("heading", { name: "Settings" }),
		).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Docs" })).toBeInTheDocument();
		expect(
			screen.getByText(
				"Repository guides and generated narrative docs now live directly inside Settings.",
			),
		).toBeInTheDocument();
	});

	it("treats unknown capture modes as degraded trust", () => {
		const unknownModeReliabilityStatus = {
			...createCaptureReliabilityStatus(),
			mode: "NONSENSE_MODE",
		} as unknown as CaptureReliabilityStatus;

		renderSurface("hygiene", unknownModeReliabilityStatus);

		expect(
			screen.getByLabelText("Capture reliability degraded"),
		).toBeInTheDocument();
		expect(screen.getAllByText("Degraded capture").length).toBeGreaterThan(0);
	});

	it("renders derived-summary authority cues for OTEL_ONLY capture reliability", () => {
		renderSurface(
			"hygiene",
			createCaptureReliabilityStatus({
				mode: "OTEL_ONLY",
				otelBaselineHealthy: true,
			}),
		);

		const derivedCues = document.querySelectorAll(
			'[data-authority-tier="derived_summary"]',
		);
		expect(derivedCues.length).toBeGreaterThan(0);
	});
});
