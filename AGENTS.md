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

## Mandatory workflow
1. Explore project first, then invoke skill.
2. IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for any React, Tauri, Apps-SDK-ui, Tailwind, Vite, Storybook + Chat Widget tasks.
3. Add a Table of Contents for docs.

## Common commands
- Install: pnpm install
- Dev app (Tauri): pnpm tauri dev
- Dev web-only: pnpm dev
- Build web: pnpm build
- Build app (Tauri): pnpm tauri build
- Typecheck: pnpm typecheck
- Lint: pnpm lint
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

## Docs table of contents
- docs/README.md
- docs/agents/development.md
- docs/agents/testing.md
- docs/agents/tauri.md
- docs/agents/repo-structure.md
- docs/agents/repair-agent.md

## Common pitfalls + fixes
- Release workflow (manual trigger): create the GitHub Release for the tag first; the workflow resolves the release by tag and fails if it does not exist.
- Release assets: the workflow fails if the tag release is missing a DMG or `latest.json` (auto-update endpoint).

## Release Protocol (CRITICAL)

**All updates MUST be published through GitHub Releases.** Do not create manual DMG files.

### Release Process
**Recommended (fully automated):**
1. Merge normal PRs into `main` using conventional commits (`feat:`, `fix:`, etc.)
2. A bot (`release-please`) opens/updates a **Release PR** that bumps versions + updates `CHANGELOG.md`
3. Merge the Release PR → it creates tag `vX.Y.Z` + a published GitHub Release

**Fallback (manual trigger):**
```bash
./scripts/release.sh 0.2.1
```

**The GitHub Action** (`.github/workflows/release.yml`) will automatically:
- Build for all platforms (macOS Intel/Apple Silicon, Windows, Linux)
- Upload build artifacts (including DMGs) to the tag’s GitHub Release
- Publish updater artifacts for auto-update (including `latest.json` + signatures)

### Why GitHub Releases?
- Enables automatic updates for existing users
- Provides signed, verified builds
- Supports all platforms from a single workflow
- Creates a proper changelog and release notes

### Auto-Update Configuration
The app is configured to check for updates via:
```json
{
  "endpoints": [
    "https://github.com/jscraik/narrative/releases/latest/download/latest.json"
  ]
}
```

### Manual DMG Files (DEPRECATED)
Manual DMG files in the repo root (e.g., `Narrative-MVP-v0.1.x-AppleSilicon.dmg`) are legacy artifacts. Do not create new ones. Users should download from GitHub Releases instead.

### Required Secrets (Repository Settings)
The GitHub Action requires these secrets in the repository settings:
- `TAURI_SIGNING_PRIVATE_KEY` - The private key for signing updates (generate with `pnpm tauri signer generate`)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Password for the private key
- `RELEASE_PLEASE_TOKEN` - GitHub PAT used by release-please to open the Release PR and create tags/releases (must not be `GITHUB_TOKEN`)

To generate a new signing key:
```bash
pnpm tauri signer generate -w ~/.tauri/narrative-mvp.key
```
Then add the public key to `tauri.conf.json` and the private key to GitHub secrets.
