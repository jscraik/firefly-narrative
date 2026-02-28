# CLAUDE.md — Agent Task Notes

## Source of truth
- Use `AGENTS.md` for repository-wide workflow and command guidance.
- Use linked `docs/agents/*.md` files for detailed, task-specific procedures.

## Scope first for frontend work
- For standalone frontend/web-only tasks, confirm scope in `docs/agents/landing-page-separation.md`.
- Then follow `docs/agents/frontend-website-rules.md`.
- For in-app Tauri UI work, follow `docs/agents/development.md` and `docs/agents/tauri.md`.

## Agent-facing quick workflow
- Run root app setup from `AGENTS.md` and `docs/agents/development.md` (for `pnpm` commands and Rust prerequisites).
- For landing-page screenshot flows, follow `docs/agents/frontend-website-rules.md` instead of duplicating commands here.

## Command preflight helper
- Source `scripts/codex-preflight.sh` and run `preflight_repo` before command-heavy, destructive, or path-sensitive work.
- Validate required bins and target paths first so mistakes are prevented before edits.
