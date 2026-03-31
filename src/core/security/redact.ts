import redactionPatterns from "../../shared/redaction-patterns.json";

export type RedactionHit = { type: string; count: number };

export type RedactionResult = {
	redacted: string;
	hits: RedactionHit[];
};

/**
 * Very small, heuristic scrubbing.
 * Goal: prevent accidentally committing secrets into `.narrative/`.
 *
 * Expand as needed.
 */
type RedactionPatternConfig = {
	kind: string;
	pattern: string;
	flags?: string;
};

const PRIVATE_KEY_PATTERN_TYPE = "PRIVATE_KEY_BLOCK";

/**
 * All patterns except PRIVATE_KEY_BLOCK. These use bounded character classes
 * and are safe to run on inputs of any length.
 */
const safeCompiledPatterns: Array<{ type: string; re: RegExp }> = (
	redactionPatterns as RedactionPatternConfig[]
)
	.filter((p) => p.kind !== PRIVATE_KEY_PATTERN_TYPE)
	.map((pattern) => {
		const baseFlags = pattern.flags ?? "";
		const flags = baseFlags.includes("g") ? baseFlags : `${baseFlags}g`;
		return { type: pattern.kind, re: new RegExp(pattern.pattern, flags) };
	});

/**
 * All patterns including PRIVATE_KEY_BLOCK. Used only for inputs within the
 * safe-size threshold.
 */
const allCompiledPatterns: Array<{ type: string; re: RegExp }> = (
	redactionPatterns as RedactionPatternConfig[]
).map((pattern) => {
	const baseFlags = pattern.flags ?? "";
	const flags = baseFlags.includes("g") ? baseFlags : `${baseFlags}g`;
	return { type: pattern.kind, re: new RegExp(pattern.pattern, flags) };
});

/**
 * Maximum input size for full-regex redaction. Above this threshold, the
 * PRIVATE_KEY_BLOCK regex ([\s\S]*?) is replaced by a linear string scanner
 * to prevent ReDoS. All other patterns still run normally.
 */
const MAX_FULL_REDACT_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Linear O(n) scanner for PEM private key blocks. Replaces the potentially
 * catastrophic `[\s\S]*?` regex with plain `indexOf` traversal.
 */
function redactPrivateKeyBlocksLinear(input: string): {
	redacted: string;
	count: number;
} {
	const BEGIN = "-----BEGIN ";
	const END = "-----END ";
	const PRIVATE_SUFFIX = "PRIVATE KEY-----";
	const replacement = `[REDACTED:${PRIVATE_KEY_PATTERN_TYPE}]`;

	let cursor = 0;
	let count = 0;
	const segments: string[] = [];

	while (cursor < input.length) {
		const beginIdx = input.indexOf(BEGIN, cursor);
		if (beginIdx < 0) break;

		const beginSuffixIdx = input.indexOf(
			PRIVATE_SUFFIX,
			beginIdx + BEGIN.length,
		);
		if (beginSuffixIdx < 0) {
			cursor = beginIdx + BEGIN.length;
			continue;
		}

		const endIdx = input.indexOf(END, beginSuffixIdx + PRIVATE_SUFFIX.length);
		if (endIdx < 0) {
			cursor = beginIdx + BEGIN.length;
			continue;
		}

		const endSuffixIdx = input.indexOf(PRIVATE_SUFFIX, endIdx + END.length);
		if (endSuffixIdx < 0) {
			cursor = beginIdx + BEGIN.length;
			continue;
		}

		const blockEnd = endSuffixIdx + PRIVATE_SUFFIX.length;
		segments.push(input.slice(cursor, beginIdx), replacement);
		count += 1;
		cursor = blockEnd;
	}

	if (count === 0) return { redacted: input, count: 0 };

	segments.push(input.slice(cursor));
	return { redacted: segments.join(""), count };
}

export function redactSecrets(input: string): RedactionResult {
	const oversized = input.length > MAX_FULL_REDACT_BYTES;

	if (oversized) {
		// biome-ignore lint/suspicious/noConsole: Oversized redaction skips are part of the tested safety contract.
		console.warn(
			`[redact] Input too large for full regex scan (${input.length} chars > ${MAX_FULL_REDACT_BYTES}). Using safe redaction mode.`,
		);
	}

	let redacted = input;
	const hits: RedactionHit[] = [];

	// Bounded patterns — always safe regardless of input size
	const patterns = oversized ? safeCompiledPatterns : allCompiledPatterns;
	for (const p of patterns) {
		const matches = redacted.match(p.re);
		if (!matches || matches.length === 0) continue;
		hits.push({ type: p.type, count: matches.length });
		redacted = redacted.replace(p.re, `[REDACTED:${p.type}]`);
	}

	// PRIVATE_KEY_BLOCK — always use linear scanner (safe for any size)
	if (oversized) {
		const result = redactPrivateKeyBlocksLinear(redacted);
		if (result.count > 0) {
			hits.push({ type: PRIVATE_KEY_PATTERN_TYPE, count: result.count });
			redacted = result.redacted;
		}
	}

	return { redacted, hits };
}
