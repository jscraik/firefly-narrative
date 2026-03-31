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
