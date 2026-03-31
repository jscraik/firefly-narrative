import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RightPanelTabs } from "../RightPanelTabs";

vi.mock("@design-studio/tokens", () => ({
	useTheme: () => ({
		theme: "dark",
		setTheme: vi.fn(),
	}),
}));

vi.mock("../DiffViewer", () => ({
	DiffViewer: ({ diffText }: { diffText: string | null }) => (
		<div data-testid="diff-viewer-content">{diffText ?? "(none)"}</div>
	),
}));

const baseProps = {
	branchScopeKey: "repo:branch-a",
	selectedFile: "src/example.ts",
	onFileClick: vi.fn(),
	onCommitClick: vi.fn(),
	selectedCommitId: "aaaa1111",
	hasFiles: true,
	onTestFileClick: vi.fn(),
	selectedCommitSha: "aaaa1111",
	diffText: "@@ -1 +1 @@",
	loadingDiff: false,
	traceRanges: [],
};

describe("RightPanelTabs diff PiP accessibility", () => {
	it("shows verification posture before the tab content", () => {
		render(<RightPanelTabs {...baseProps} />);

		expect(screen.getByText("Verification rail")).toBeInTheDocument();
		expect(screen.getByText("Evidence first")).toBeInTheDocument();
	});

	it("falls back to diff-first posture when stronger evidence is unavailable", () => {
		render(
			<RightPanelTabs
				{...baseProps}
				branchScopeKey="repo:branch-b"
				selectedCommitSha={null}
			/>,
		);

		expect(screen.getByText("Diff first")).toBeInTheDocument();
	});

	it("accepts a controller-owned verification posture override", () => {
		render(
			<RightPanelTabs
				{...baseProps}
				verificationMode="session-first"
				selectedCommitSha={null}
				testRun={undefined}
				traceSummary={undefined}
				traceStatus={undefined}
			/>,
		);

		expect(screen.getByText("Session first")).toBeInTheDocument();
	});

	it("uses roving focus for keyboard tab navigation and exposes horizontal tab semantics", () => {
		render(
			<RightPanelTabs
				{...baseProps}
				verificationMode="session-first"
				sessionExcerpts={[
					{
						id: "session-1",
						tool: "codex",
						messages: [
							{
								id: "message-1",
								role: "assistant",
								text: "Context",
							},
						],
						importedAtISO: "2026-03-30T21:00:00.000Z",
					},
				]}
				selectedCommitSha={null}
				testRun={undefined}
				traceSummary={undefined}
				traceStatus={undefined}
			/>,
		);

		const tablist = screen.getByRole("tablist", { name: "Right panel tabs" });
		const sessionTab = screen.getByRole("tab", { name: "Session" });

		expect(tablist).toHaveAttribute("aria-orientation", "horizontal");

		sessionTab.focus();
		expect(sessionTab).toHaveFocus();

		fireEvent.keyDown(sessionTab, { key: "ArrowRight" });

		const attributionTab = screen.getByRole("tab", { name: "Attribution" });
		expect(attributionTab).toHaveAttribute("aria-selected", "true");
		expect(attributionTab).toHaveFocus();

		fireEvent.keyDown(attributionTab, { key: "End" });

		const settingsTab = screen.getByRole("tab", { name: "Settings" });
		expect(settingsTab).toHaveAttribute("aria-selected", "true");
		expect(settingsTab).toHaveFocus();
	});

	it("renders only the active tabpanel in the accessibility tree", () => {
		render(<RightPanelTabs {...baseProps} />);

		expect(screen.getByRole("tabpanel", { name: "Tests" })).toBeInTheDocument();
		expect(
			screen.queryByRole("tabpanel", { name: "Session" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("tabpanel", { name: "AI Attribution" }),
		).not.toBeInTheDocument();
	});

	it("renders diff PiP as an accessible dialog and closes on Escape", async () => {
		render(<RightPanelTabs {...baseProps} />);

		fireEvent.click(screen.getByTitle("Toggle diff panel"));
		fireEvent.click(screen.getByRole("button", { name: "Pop out diff panel" }));

		const dialog = await screen.findByRole("dialog", { name: "example.ts" });
		expect(dialog).toHaveAttribute("aria-modal", "true");

		fireEvent.keyDown(dialog, { key: "Escape" });

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "example.ts" }),
			).not.toBeInTheDocument();
		});
	});

	it("keeps keyboard focus trapped inside the dialog on tab navigation", async () => {
		render(<RightPanelTabs {...baseProps} />);

		fireEvent.click(screen.getByTitle("Toggle diff panel"));
		fireEvent.click(screen.getByRole("button", { name: "Pop out diff panel" }));

		const dialog = await screen.findByRole("dialog", { name: "example.ts" });
		const dockButton = await screen.findByRole("button", {
			name: "Close diff dialog and dock panel",
		});

		await waitFor(() => {
			expect(dockButton).toHaveFocus();
		});

		fireEvent.keyDown(dialog, { key: "Tab" });
		expect(dockButton).toHaveFocus();

		fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
		expect(dockButton).toHaveFocus();
	});
});
