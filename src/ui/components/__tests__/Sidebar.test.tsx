import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Mode } from "../../../core/types";
import { Sidebar } from "../Sidebar";

vi.mock("@design-studio/tokens", () => ({
	useTheme: () => ({ colorScheme: "dark", theme: "system" }),
}));

const VISIBLE_NAV_LABELS = [
	"Narrative Brief",
	"Repo Evidence",
	"Sessions",
	"Tools",
	"Hygiene",
	"Settings",
];

function renderSidebar(activeMode: Mode = "dashboard") {
	render(
		<Sidebar
			mode={activeMode}
			onModeChange={vi.fn()}
			onOpenRepo={vi.fn()}
			onImportSession={vi.fn()}
		/>,
	);
}

function getTab(name: string) {
	return screen.getByRole("tab", { name });
}

describe("Sidebar", () => {
	it("renders a flat six-item primary nav with no visible section headers", () => {
		renderSidebar();

		for (const label of VISIBLE_NAV_LABELS) {
			expect(getTab(label)).toBeInTheDocument();
		}

		expect(screen.queryByText("Narrative")).not.toBeInTheDocument();
		expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
		expect(screen.queryByText("Workspace")).not.toBeInTheDocument();
		expect(screen.queryByText("Integrations")).not.toBeInTheDocument();
		expect(screen.queryByText("Health")).not.toBeInTheDocument();
		expect(screen.queryByText("Configure")).not.toBeInTheDocument();
	});

	it("marks the active lane directly without legacy owner remapping", () => {
		renderSidebar("hygiene");

		expect(getTab("Hygiene")).toHaveAttribute("aria-selected", "true");
		expect(getTab("Settings")).toHaveAttribute("aria-selected", "false");
		expect(getTab("Repo Evidence")).toHaveAttribute("aria-selected", "false");
	});

	it("retains shell actions below the primary nav", () => {
		renderSidebar();

		expect(
			screen.getByRole("button", { name: "Open Repo" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Import Session" }),
		).toBeInTheDocument();
	});
});
