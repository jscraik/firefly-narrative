# GEMINI.md — Prompt Context Notes

## Source of truth
- Use `AGENTS.md` for repository-wide workflow, command map, and conventions.
- Use linked `docs/agents/*.md` files for task-specific procedures.

## Quick scope routing
- For standalone frontend/web-only work, confirm scope in `docs/agents/landing-page-separation.md` and follow `docs/agents/frontend-website-rules.md`.
- For in-app Tauri UI work, follow `docs/agents/development.md` and `docs/agents/tauri.md`.
- Do architecture-first bootstrap before deeper work: read `.diagram/manifest.json`, then `.diagram/architecture.mmd`.
- If diagram artifacts are missing or stale, regenerate with `diagram analyze` (fallback: `npx --yes @brainwav/diagram analyze`) before planning.

## Canonical command map (repo evidence)
- install: `pnpm install`
- run scripts: `pnpm <script>`
- run binaries: `pnpm exec <command>`

## Primary evidence-backed quick commands
- tests: `pnpm test`
- flaky evidence: `bash scripts/test-with-artifacts.sh all` (or `pnpm test:artifacts`)
- build: `pnpm build`
- desktop app dev: `pnpm tauri:dev`

## Instruction sync note
- Keep `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` aligned on scope, commands, and linked instruction paths.
- If conflicts appear, prefer repo `AGENTS.md` as canonical and route detailed resolution notes via `docs/agents/instruction-governance.md`.

## Command preflight helper
- Use bash invocation from zsh shells: `bash -lc 'source scripts/codex-preflight.sh && preflight_repo'` before command-heavy, destructive, or path-sensitive work.
- Validate required bins and target paths first so mistakes are prevented before edits.
