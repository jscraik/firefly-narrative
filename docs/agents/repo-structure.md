# Repository Structure (High Level)

This document outlines the organization of the Narrative codebase.

## Codebase Layout

### Top-Level Directories

- `src/` - React Frontend (UI components, views, hooks).
- `src-tauri/` - Rust Backend (tauri commands, database, git operations).
- `docs/` - Documentation, screenshots, audit reports, and design notes.
- `scripts/` - Local development scripts and tooling.
- `examples/` - Sample data and usage examples.
- `fixtures/` - Test fixtures and captured samples.
- `brand/` - Official brand assets and guidelines.
- `tools/` - Repository maintenance tools.

### Key Configuration Files

- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`, `LICENSE` - Project documentation.
- `package.json`, `pnpm-lock.yaml` - Node.js dependencies.
- `vite.config.ts`, `playwright.config.ts` - Build and test configuration.
- `CHANGELOG.md` - Version history.
- `AGENTS.md` - Instructions for AI agents working on this repo.

## UI Mapping

The visible application structure (`src/ui/`) corresponds to the main views you see in the app:

<img src="../assets/screenshots/dashboard.png" width="600" alt="Dashboard View - src/ui/views/DashboardView.tsx">

- **Dashboard**: `src/ui/views/DashboardView.tsx` (Components in `src/ui/components/dashboard/`)
- **repo View**: `src/ui/views/BranchView.tsx` (Components in `src/ui/components/`)
- **Landing Page**: `src/ui/views/FireflyLanding.tsx`
- **Navigation**: `src/ui/components/TopNav.tsx`
