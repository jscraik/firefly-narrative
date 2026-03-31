import { renderMermaid } from "beautiful-mermaid";
import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
	chart: string;
}

const BLOCKED_TAGS = new Set(["script", "foreignobject"]);

function sanitizeMermaidSvg(markup: string): SVGSVGElement {
	const parser = new DOMParser();
	const doc = parser.parseFromString(markup, "image/svg+xml");
	const svg = doc.documentElement;

	if (svg.nodeName.toLowerCase() !== "svg") {
		throw new Error("Invalid Mermaid SVG output");
	}

	const walker = doc.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
	const toRemove: Element[] = [];

	while (walker.nextNode()) {
		const el = walker.currentNode as Element;
		const tag = el.tagName.toLowerCase();

		if (BLOCKED_TAGS.has(tag)) {
			toRemove.push(el);
			continue;
		}

		for (const attr of Array.from(el.attributes)) {
			const name = attr.name.toLowerCase();
			const value = attr.value.trim().toLowerCase();
			if (name.startsWith("on")) {
				el.removeAttribute(attr.name);
			} else if (
				(name === "href" || name === "xlink:href") &&
				value.startsWith("javascript:")
			) {
				el.removeAttribute(attr.name);
			}
		}
	}

	for (const el of toRemove) {
		el.remove();
	}

	const imported = document.importNode(svg, true);
	if (!(imported instanceof SVGSVGElement)) {
		throw new Error("Invalid Mermaid SVG output");
	}
	return imported;
}

/**
 * Renders a Mermaid diagram using beautiful-mermaid.
 * Creates beautiful, themeable SVG diagrams.
 */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string>("");

	useEffect(() => {
		const renderDiagram = async () => {
			if (!chart || !containerRef.current) return;

			try {
				const renderedSvg = await renderMermaid(chart);
				const sanitized = sanitizeMermaidSvg(renderedSvg);
				containerRef.current.replaceChildren();
				containerRef.current.appendChild(sanitized);
				setError("");
			} catch (err) {
				// biome-ignore lint/suspicious/noConsole: Diagram render failures are intentionally surfaced.
				console.error("[MermaidDiagram] Failed to render diagram:", err);
				setError("Failed to render diagram");
				if (containerRef.current) {
					containerRef.current.replaceChildren();
				}
			}
		};

		void renderDiagram();
	}, [chart]);

	if (error) {
		return (
			<div className="rounded-lg border border-accent-red-light bg-accent-red-bg p-4 text-sm text-text-secondary">
				<p className="font-medium text-accent-red">Diagram Error</p>
				<p className="mt-1 text-accent-red">{error}</p>
				<pre className="mt-2 rounded bg-bg-tertiary p-2 text-xs overflow-auto">
					{chart}
				</pre>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="mermaid-diagram my-4 rounded-lg border border-border-light bg-bg-secondary p-4 overflow-auto"
		/>
	);
}
