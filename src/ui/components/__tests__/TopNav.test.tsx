import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopNav } from "../TopNav";

describe("TopNav", () => {
	it("renders the dashboard under the Narrative Brief lane", () => {
		render(
			<TopNav
				mode="dashboard"
				onModeChange={vi.fn()}
				onOpenRepo={vi.fn()}
				repoPath="/Users/jamiecraik/dev/trace-narrative"
			/>,
		);

		expect(screen.getByText("Narrative")).toBeInTheDocument();
		expect(screen.getByText("Narrative Brief")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Repo Evidence" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("/Users/jamiecraik/dev/trace-narrative"),
		).toBeInTheDocument();
	});

	it("frames hygiene as the health lane and offers core jumps", () => {
		const onModeChange = vi.fn();
		render(
			<TopNav
				mode="hygiene"
				onModeChange={onModeChange}
				onOpenRepo={vi.fn()}
			/>,
		);

		expect(screen.getByText("Health")).toBeInTheDocument();
		expect(screen.getAllByText("Hygiene").length).toBeGreaterThan(0);

		fireEvent.click(screen.getByRole("button", { name: "Repo Evidence" }));
		fireEvent.click(screen.getByRole("button", { name: "Narrative Brief" }));

		expect(onModeChange).toHaveBeenNthCalledWith(1, "repo");
		expect(onModeChange).toHaveBeenNthCalledWith(2, "dashboard");
	});

	it("frames settings as the docs-and-config lane", () => {
		const onModeChange = vi.fn();
		render(
			<TopNav
				mode="settings"
				onModeChange={onModeChange}
				onOpenRepo={vi.fn()}
			/>,
		);

		expect(screen.getByText("Configure")).toBeInTheDocument();
		expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);

		fireEvent.click(screen.getByRole("button", { name: "Repo Evidence" }));
		expect(onModeChange).toHaveBeenCalledWith("repo");
	});
});
