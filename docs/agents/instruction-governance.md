---
schema_version: 1
---

# Instruction Governance

## Contradictions (open)

- None currently observed.

## Contradictions (resolved)

- [RESOLVED] Frontend website rules are scoped to standalone landing-page work only, not default in-app Tauri UI edits.
- [RESOLVED] This repository is repo-specific; repo-local instructions override config-repo essentials from `/Users/jamiecraik/.codex/AGENTS.md` when they differ (for example package manager and command set).
- [RESOLVED] Frontend rules are scoped for landing-page/web-only work only, especially for the planned separation of the landing page from the Tauri app.

## Flag for deletion candidates

- Remove repeated screenshot command lists from non-canonical files when they duplicate `docs/agents/frontend-website-rules.md`.
- Keep one canonical place for screenshot naming examples to avoid drift.
- Remove generic wording if a concrete command already exists in a linked doc.
- If this separation boundary becomes stable, merge notes from `landing-page-separation.md` into `frontend-website-rules.md` and mark this as finalized.
