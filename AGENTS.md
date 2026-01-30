schema_version: 1

# Narrative Desktop MVP
A Tauri desktop app that layers AI session narratives onto git history.

## References (informational)
- Global protocol: ~/.codex/instructions/rvcp-common.md
- Global override: ~/.codex/AGENTS.override.md
- Global codestyle: ~/.codex/instructions/CODESTYLE.md
- Pre-flight checklist (significant tasks): ~/.codex/instructions/README.checklist.md

## Tooling essentials
- Package manager: pnpm (Node via mise).
- Rust toolchain + Tauri system deps (see Tauri docs).
- Git must be on PATH (the app invokes git via tauri-plugin-shell).

## Common commands
- Install: pnpm install
- Dev app (Tauri): pnpm tauri dev
- Dev web-only: pnpm dev
- Build web: pnpm build
- Build app (Tauri): pnpm tauri build
- Typecheck: pnpm typecheck
- Tests: pnpm test

## Instruction discovery order
1. Global: ~/.codex/AGENTS.override.md (or ~/.codex/AGENTS.md if override missing)
2. Repo root: ./AGENTS.md
3. Subdirectories: nested AGENTS.override.md / AGENTS.md

## Guides
- docs/agents/development.md
- docs/agents/tauri.md
- docs/agents/testing.md
- docs/agents/repo-structure.md
