---
status: complete
priority: p3
issue_id: FR-007
tags:
  - code-review
  - typescript
  - reliability
dependencies: []
---

## Problem Statement
DialKit drag enhancer attaches DOM-specific state via `(panel as any)._cleanupDrag`, which relies on unsafe typing and ad-hoc property mutation. This weakens type safety and can hide future breakage if DialKit internals change.

## Findings
- `DialKitEnhancer` assigns and invokes `_cleanupDrag` on the queried `.dialkit-panel` element using `any` casts.
- Bi-directional cleanup depends on a dynamic property not guaranteed by TypeScript or runtime contract.
- This increases risk of uncaught `TypeError` if DialKit DOM shape changes in a minor update.

### Evidence
- `src/ui/components/DialKitEnhancer.tsx:88-102`

## Proposed Solutions
### Option 1: Introduce a typed element utility wrapper (Recommended)
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Stronger safety and future-proofing.
- **Approach:**
  - Keep cleanup function in closure scoped within effect.
  - Avoid mutating panel with custom properties.
  - Use `const cleanupRef = useRef<(() => void) | null>(null)`.

### Option 2: Query and cleanup via `AbortController`-style listener registration
- **Effort:** Medium
- **Risk:** Low
- **Pros:** No custom properties required.
- **Approach:**
  - Use scoped `addEventListener` with `{ once: false }` wrappers and explicit cleanup closure returned from polling callback.

### Option 3: Add robust null-safety + class guard
- **Effort:** Small
- **Risk:** Medium
- **Pros:** Less intrusive.
- **Approach:**
  - Keep current approach but introduce explicit type guard and `cleanup` storage in ref (not `any` on element).

## Recommended Action

## Technical Details
- Affected file: `src/ui/components/DialKitEnhancer.tsx`
- Runtime dependency: external `dialkit` portal markup.

## Acceptance Criteria
- [ ] No `any` casts for critical DOM cleanup path.
- [ ] Cleanup handles panel replacement/recreation safely.
- [ ] `pnpm lint` no `noExplicitAny` in this file.

## Work Log
- 2026-02-24: Implemented and verified fix locally (`pnpm lint`, `pnpm typecheck`).
- 2026-02-23: Recorded unsafe typed DOM contract in drag enhancer fallback path.

## Resources
- Reviewed files: `src/ui/components/DialKitEnhancer.tsx`
