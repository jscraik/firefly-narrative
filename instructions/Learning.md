# Learning

Agent knowledge base for trace-narrative. Append-only.

> **Scope:** Repo-specific patterns for trace-narrative.
> **Format:** `**YYYY-MM-DD:** <pattern>`

## Silent Error Detection Pattern

**2026-03-31:** The harness-gates CI check enforces strict silent-error detection. Underscore-prefixed catch variables (`_err`, `_e`) are treated as ERRORS even with `biome-ignore` comments.

**Rule:** When catching errors that should be observable but not fatal:
1. Use `err` or `e` (not `_err` or `_e`)
2. Add `// biome-ignore lint/suspicious/noConsole` with explanatory message
3. Log with `console.warn()` or `console.error()`

**Example:**
```typescript
// WRONG - fails harness-gates
}).catch((_e) => {
  return [];
}),

// RIGHT - passes harness-gates
}).catch((err) => {
  // biome-ignore lint/suspicious/noConsole: Best-effort loading failures must remain observable.
  console.warn("[Module] Operation failed:", err);
  return [];
}),
```

**Affected patterns in this repo:**
- Promise `.catch()` blocks in indexer.ts
- JSON parse error handling in agentation scripts
- Best-effort file loading failures

**Files fixed in PR #97 (2026-03-31):**
- `src/ui/components/DocsOverviewPanel.tsx`
- `src/ui/components/MermaidDiagram.tsx`
- `src/core/repo/indexer.ts` (4 catch blocks)
- `scripts/agentation-autopilot.mjs`
- `scripts/agentation-webhook-listener.mjs`
- `src/hooks/useSnapshots.ts`
- `src/core/repo/snapshots.ts` (2 catch blocks)
- `src/core/repo/sessions.ts` (2 catch blocks)
- `src/core/repo/narrativeFeedback.ts`
- `src/core/repo/db.ts`
- `src/core/tauri/settings.ts`
- `src/ui/views/useDashboardViewState.ts` (2 catch blocks)
