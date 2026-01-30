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
export function redactSecrets(input: string): RedactionResult {
  const patterns: Array<{ type: string; re: RegExp }> = [
    { type: 'OPENAI_KEY', re: /\bsk-[A-Za-z0-9]{20,}\b/g },
    { type: 'GITHUB_TOKEN', re: /\bghp_[A-Za-z0-9]{20,}\b/g },
    { type: 'AWS_ACCESS_KEY', re: /\bAKIA[0-9A-Z]{16}\b/g },
    { type: 'PRIVATE_KEY_BLOCK', re: /-----BEGIN[\s\S]*?PRIVATE KEY-----[\s\S]*?-----END[\s\S]*?PRIVATE KEY-----/g },
    { type: 'BEARER_TOKEN', re: /\bBearer\s+[A-Za-z0-9._-]+\b/g }
  ];

  let redacted = input;
  const hits: RedactionHit[] = [];

  for (const p of patterns) {
    const matches = redacted.match(p.re);
    if (!matches || matches.length === 0) continue;
    hits.push({ type: p.type, count: matches.length });
    redacted = redacted.replace(p.re, `[REDACTED:${p.type}]`);
  }

  return { redacted, hits };
}
