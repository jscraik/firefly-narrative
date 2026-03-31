import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocsOverviewPanel } from "../DocsOverviewPanel";

const mockListNarrativeFiles = vi.hoisted(() => vi.fn());
const mockReadNarrativeFile = vi.hoisted(() => vi.fn());
const mockRenderMermaid = vi.hoisted(() => vi.fn());

vi.mock("framer-motion", () => ({
	motion: {
		div: ({ children, ...props }: { children?: ReactNode }) => (
			<div {...props}>{children}</div>
		),
	},
}));

vi.mock("lucide-react", () => {
	const Icon = () => <span aria-hidden="true" />;
	return { BookOpen: Icon, ChevronRight: Icon, FileText: Icon, X: Icon };
});

vi.mock("../RepositoryPlaceholderCard", () => ({
	RepositoryPlaceholderCard: () => <div>Repo Placeholder</div>,
}));

vi.mock("../../../core/tauri/narrativeFs", () => ({
	ensureNarrativeDirs: vi.fn(),
	listNarrativeFiles: mockListNarrativeFiles,
	readNarrativeFile: mockReadNarrativeFile,
	writeNarrativeFile: vi.fn(),
}));

vi.mock("beautiful-mermaid", () => ({
	renderMermaid: mockRenderMermaid,
}));

describe("DocsOverviewPanel security", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("does not render raw HTML from docs as live DOM elements", async () => {
		mockListNarrativeFiles.mockResolvedValue(["unsafe.md"]);
		mockReadNarrativeFile.mockImplementation(
			async (_root: string, path: string) => {
				if (path === "unsafe.md") {
					return '# Unsafe\n\n<div data-testid="evil">owned</div>';
				}
				return "";
			},
		);

		render(<DocsOverviewPanel repoRoot="/repo" />);

		await waitFor(() => {
			expect(screen.getByText("Unsafe")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("Unsafe"));

		await waitFor(() => {
			expect(mockReadNarrativeFile).toHaveBeenCalledWith("/repo", "unsafe.md");
		});

		// The raw HTML element must NOT be injected as live DOM
		expect(document.querySelector('[data-testid="evil"]')).toBeNull();
	});

	it("sanitizes rendered Mermaid SVG before inserting it into the DOM", async () => {
		mockListNarrativeFiles.mockResolvedValue(["diagram.md"]);
		mockReadNarrativeFile.mockImplementation(
			async (_root: string, path: string) => {
				if (path === "diagram.md") {
					return "# Diagram\n\n```mermaid\ngraph TD\n  A-->B\n```";
				}
				return "";
			},
		);
		mockRenderMermaid.mockResolvedValue(
			'<svg xmlns="http://www.w3.org/2000/svg"><script>window.__evil = true</script><a href="javascript:alert(1)" onclick="alert(1)"><text>Hello</text></a></svg>',
		);

		const { container } = render(<DocsOverviewPanel repoRoot="/repo" />);

		await waitFor(() => {
			expect(screen.getByText("Diagram")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("Diagram"));

		await waitFor(() => {
			expect(mockRenderMermaid).toHaveBeenCalled();
		});

		const mermaidContainer = container.querySelector(".mermaid-diagram");
		expect(mermaidContainer?.querySelector("script")).toBeNull();
		const link = mermaidContainer?.querySelector("a");
		expect(link).not.toBeNull();
		expect(link?.getAttribute("href")).toBeNull();
		expect(link?.getAttribute("onclick")).toBeNull();
	});
});
