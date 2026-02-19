# Documentation Index

This directory contains developer documentation and operational notes for the Narrative desktop application.

## Audience

- Contributors and maintainers running, testing, or releasing the app.
- Users looking for advanced configuration details.

## Contents

- [`docs/agents/development.md`](agents/development.md) — Prerequisites, running locally, and build commands.
- [`docs/agents/testing.md`](agents/testing.md) — Testing, type-checking, and linting.
- [`docs/agents/tauri.md`](agents/tauri.md) — Tauri permissions and data locations.
- [`docs/agents/repo-structure.md`](agents/repo-structure.md) — Overview of the codebase layout.
- [`docs/agents/repair-agent.md`](agents/repair-agent.md) — Workflow for the autonomous CI repair agent.
- `docs/assets/screenshots/` — Visual assets for documentation (landing, dashboard, repo views).
- `docs/reports/` — Audit and post-merge review reports.

## Documentation Checks

To verify documentation locally:

```bash
# Run the project docs lint wrapper (skips Vale when unavailable)
pnpm docs:lint

# Lint markdown files
npx -y markdownlint-cli2 README.md docs/**/*.md brand/README.md

# Check writing style (if configured)
vale --minAlertLevel=warning README.md docs/README.md docs/agents/*.md
```

## Maintenance

- Update this index when adding new documentation pages.
- Ensure screenshots in `docs/assets/screenshots/` are kept up-to-date as the UI evolves.

## Meta

- **Last updated**: 2026-02-18
