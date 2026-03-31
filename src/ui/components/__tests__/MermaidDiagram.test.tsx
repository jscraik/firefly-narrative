import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MermaidDiagram } from "../MermaidDiagram";

const mockRenderMermaid = vi.hoisted(() => vi.fn());

vi.mock("beautiful-mermaid", () => ({
	renderMermaid: mockRenderMermaid,
}));

describe("MermaidDiagram", () => {
	it("strips executable content from rendered mermaid SVG output", async () => {
		mockRenderMermaid.mockResolvedValue(
			`<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert('xss')</script>
        <foreignObject><div>blocked</div></foreignObject>
        <g onclick="alert('xss')">
          <a href="javascript:alert('xss')">bad link</a>
          <text>safe</text>
        </g>
      </svg>`,
		);

		const { container } = render(<MermaidDiagram chart="graph TD; A-->B;" />);

		await waitFor(() => {
			expect(container.querySelector("svg")).toBeInTheDocument();
		});

		expect(container.querySelector("script")).toBeNull();
		expect(container.querySelector("foreignObject")).toBeNull();
		expect(container.querySelector("[onclick]")).toBeNull();
		const href = container.querySelector("a")?.getAttribute("href") ?? "";
		expect(href).not.toContain("javascript:");
		expect(container.querySelector("text")?.textContent).toBe("safe");
	});
});
