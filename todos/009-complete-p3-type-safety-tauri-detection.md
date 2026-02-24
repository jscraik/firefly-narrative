---
status: complete
priority: p3
issue_id: FR-009
tags:
  - code-review
  - typescript
  - reliability
  - security
dependencies: []
---

## Problem Statement
Runtime environment detection for Tauri uses `window as any` with ad-hoc global fields, increasing fragility under non-browser runtimes and weakening type safety.

## Findings
- Docs mode now checks `(window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI_IPC__` in multiple paths.
- This bypasses type checks and can produce false negatives/positives if host global names change, and makes static linting treat `any` as unacceptable.
- Similar unsafe typing is used in DialKit enhancer, indicating a broader compatibility/type-safety gap.

### Evidence
- `src/App.tsx:87,128`
- `src/ui/components/DialKitEnhancer.tsx:88,99`

## Proposed Solutions
### Option 1: Introduce a typed `isTauri` helper (Recommended)
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Centralizes host detection and keeps `any` out of app flow.
- **Approach:**
  - Add `isTauriEnvironment(): boolean` helper with guarded `window`/property checks.
  - Optionally feature-detect via `__TAURI__` or API call wrappers.

### Option 2: Add adapter abstraction
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Easier testing across desktop vs web.
- **Approach:**
  - Create environment service module and inject in `DocsView` and shell integration points.

### Option 3: Runtime-safe guard + telemetry
- **Effort:** Small
- **Risk:** Low
- **Approach:**
  - Keep inline checks but avoid `any` by using `typeof window !== undefined` and `Object.prototype.hasOwnProperty` checks.

## Recommended Action

## Technical Details
- Affected files: `src/App.tsx`, `src/ui/components/DialKitEnhancer.tsx`

## Acceptance Criteria
- [ ] No `window as any` casts in this area.
- [ ] Host detection is covered by unit tests for browser and Tauri-like environments.
- [ ] `pnpm lint` warnings for `noExplicitAny` removed.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Documented current brittle environment detection strategy.

## Resources
- Affected code locations above.
