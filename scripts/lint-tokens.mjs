import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const UI_GLOBS_ROOT = path.join(ROOT, 'src', 'ui');
const CSS_FILE = path.join(ROOT, 'src', 'styles.css');
const ALLOWLIST_FILE = path.join(ROOT, 'tools', 'token-lint-allowlist.txt');

const UI_RULES = [
  { name: 'bg-white', re: /\bbg-white\b/ },
  { name: 'text-slate-*', re: /\btext-slate-/ },
  { name: 'border-slate-*', re: /\bborder-slate-/ },
  { name: 'bg-slate-*', re: /\bbg-slate-/ },
  { name: 'bg-sky-*', re: /\bbg-sky-/ },
  { name: 'text-sky-*', re: /\btext-sky-/ },
  { name: 'bg-amber-*', re: /\bbg-amber-/ },
  { name: 'text-amber-*', re: /\btext-amber-/ },
  { name: 'bg-emerald-*', re: /\bbg-emerald-/ },
  { name: 'text-emerald-*', re: /\btext-emerald-/ },
  { name: 'bg-red-*', re: /\bbg-red-/ },
  { name: 'text-red-*', re: /\btext-red-/ },
  { name: 'ring-sky-*', re: /\bring-sky-/ },
  { name: 'from-sky-*', re: /\bfrom-sky-/ },
  { name: 'to-violet-*', re: /\bto-violet-/ },
  { name: 'bg-violet-*', re: /\bbg-violet-/ },
  { name: 'text-violet-*', re: /\btext-violet-/ },
];

const CSS_RULES = [
  { name: 'hex color', re: /#[0-9a-fA-F]{3,8}\b/ },
  { name: 'rgb()/rgba()', re: /\brgba?\(/ },
  { name: 'prefers-color-scheme', re: /\bprefers-color-scheme\b/ },
];

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function parseAllowlist(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = raw.split('\t');
    if (parts.length < 3) {
      throw new Error(
        `Invalid allowlist entry on line ${i + 1} (expected: pathPrefix<TAB>tokenRegex<TAB>reason): ${raw}`
      );
    }

    const [pathPrefix, tokenRegex, ...reasonParts] = parts;
    const reason = reasonParts.join('\t').trim();
    entries.push({
      pathPrefix: pathPrefix.trim(),
      tokenRe: new RegExp(tokenRegex.trim()),
      reason,
    });
  }

  return entries;
}

function isAllowlisted(relPath, line, allowlist) {
  for (const entry of allowlist) {
    if (!relPath.startsWith(entry.pathPrefix)) continue;
    if (entry.tokenRe.test(line)) return true;
  }
  return false;
}

async function listFilesRecursive(dir, predicate) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(p, predicate)));
    } else if (entry.isFile()) {
      if (predicate(p)) out.push(p);
    }
  }
  return out;
}

function scanTextByLine({ relPath, text, rules, allowlist, skipLine }) {
  const violations = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i] ?? '';
    if (skipLine?.(lineNo, line)) continue;
    if (isAllowlisted(relPath, line, allowlist)) continue;

    for (const rule of rules) {
      const match = rule.re.exec(line);
      if (!match) continue;
      violations.push({
        relPath,
        lineNo,
        colNo: (match.index ?? 0) + 1,
        rule: rule.name,
        excerpt: line.trim().slice(0, 200),
      });
    }
  }

  return violations;
}

function buildCssSkipLineFn(cssText) {
  const lines = cssText.split(/\r?\n/);
  const allowed = new Set();
  let inAllow = false;

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i] ?? '';

    const hasStart = line.includes('/* token-lint: allow */');
    const hasEnd = line.includes('/* token-lint: end */');

    if (hasStart) inAllow = true;
    if (inAllow) allowed.add(lineNo);
    if (hasEnd) inAllow = false;
  }

  if (inAllow) {
    throw new Error('Unclosed CSS allow block: missing `/* token-lint: end */`.');
  }

  return (lineNo) => allowed.has(lineNo);
}

async function main() {
  const allowlist = (await fileExists(ALLOWLIST_FILE))
    ? parseAllowlist(await fs.readFile(ALLOWLIST_FILE, 'utf8'))
    : [];

  const uiFiles = await listFilesRecursive(UI_GLOBS_ROOT, (p) => p.endsWith('.tsx'));
  const violations = [];

  for (const file of uiFiles) {
    const text = await fs.readFile(file, 'utf8');
    const relPath = path.relative(ROOT, file);
    violations.push(...scanTextByLine({ relPath, text, rules: UI_RULES, allowlist }));
  }

  const cssText = await fs.readFile(CSS_FILE, 'utf8');
  const cssRel = path.relative(ROOT, CSS_FILE);
  const skipCssLine = buildCssSkipLineFn(cssText);
  violations.push(
    ...scanTextByLine({
      relPath: cssRel,
      text: cssText,
      rules: CSS_RULES,
      allowlist,
      skipLine: (lineNo) => skipCssLine(lineNo),
    })
  );

  if (violations.length > 0) {
    for (const v of violations) {
      // eslint-disable-next-line no-console
      console.error(`${v.relPath}:${v.lineNo}:${v.colNo} [${v.rule}] ${v.excerpt}`);
    }
    // eslint-disable-next-line no-console
    console.error(`\nToken lint failed: ${violations.length} violation(s).`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('Token lint passed.');
}

await main();

