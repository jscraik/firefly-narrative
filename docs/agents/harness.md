# Harness Workflows

Procedures for `@brainwav/coding-harness` operations in this repo.
Run all commands via `bash scripts/harness-cli.sh <cmd>`.

## Table of Contents

- [Before you start](#before-you-start)
- [Preferred path for mature installs](#preferred-path-for-mature-installs)
- [harness init --update](#harness-init---update)
- [harness init --migrate](#harness-init---migrate)
- [CircleCI migration (separate from init)](#circleci-migration-separate-from-init)
- [Post-update verification](#post-update-verification)
- [Rollback](#rollback)
- [CI failure: contract validation errors](#ci-failure-contract-validation-errors)
- [Known biome.json regressions](#known-biomejson-regressions)

## Before you start

Confirm the installed package resolves before touching harness-managed files:

```bash
npm whoami --registry=https://registry.npmjs.org/
bash scripts/harness-cli.sh doctor --json | jq "{version, counts}"
```

If `npm whoami` fails locally, fix package registry auth first. In this repo that should come
from user-level `~/.npmrc` or a valid `npm login`; the repo-local [`.npmrc`](/Users/jamiecraik/dev/trace-narrative/.npmrc)
must only route the `@brainwav` scope and should not set an auth token.

Check if updates are available before touching anything:

```bash
test -f .harness/restore-manifest.json || bash scripts/harness-cli.sh init --track
bash scripts/harness-cli.sh init --check-updates
```

If already up to date, stop — no action needed.

## Preferred path for mature installs

If the repo already has tracked harness state and an upgrade manifest, prefer the
version-aware upgrade flow before using `init --update`:

```bash
test -f .harness/upgrade-manifest.json && bash scripts/harness-cli.sh upgrade --dry-run
```

Use `init --update` as the lower-level template refresh path when `upgrade`
metadata is absent or when you are explicitly following a template-only repair.

## harness init --update

`--update` uses the existing `.harness/restore-manifest.json` file to decide what
to re-render. If the manifest does not exist, run `init --track` once first.

### Safe update sequence

```bash
# 1. Ensure tracked manifest exists (one-time bootstrap)
test -f .harness/restore-manifest.json || bash scripts/harness-cli.sh init --track

# 2. Confirm there is actually an update to apply
bash scripts/harness-cli.sh init --check-updates

# 3. Apply tracked template updates
bash scripts/harness-cli.sh init --update

# 4. Migrate the contract schema to the new version
bash scripts/harness-cli.sh init --migrate

# 5. Verify the contract loads cleanly
bash scripts/harness-cli.sh blast-radius \
  --contract harness.contract.json \
  --files "src/core/types.ts"

# 6. Fix any regressions (see below), then
pnpm lint && pnpm typecheck
```

## harness init --migrate

Migrates `harness.contract.json` to the latest schema version supported by the
installed harness package. Always run this after `--update`.

This command migrates contract schema only. It does not perform CI-provider
transitions (for example, GitHub Actions -> CircleCI).

```bash
bash scripts/harness-cli.sh init --migrate
```

Check the version in the file afterwards:

```bash
jq ".version" harness.contract.json
```

The output should match the harness package's expected schema version.

## CircleCI migration (separate from init)

Use the dedicated `ci-migrate` workflow for provider transition:

```bash
# 1. Stage a migration snapshot and preview changes
bash scripts/harness-cli.sh ci-migrate prepare --provider circleci --dry-run

# 2. Apply migration changes
bash scripts/harness-cli.sh ci-migrate prepare --provider circleci --apply

# 3. Verify and then commit the snapshot emitted by prepare
bash scripts/harness-cli.sh ci-migrate verify --snapshot <snapshot-id>
bash scripts/harness-cli.sh ci-migrate commit --snapshot <snapshot-id>
```

## Post-update verification

After any `--update` + `--migrate`, run these in order:

```bash
# 1. Contract validates (must not print "ContractLoadError")
bash scripts/harness-cli.sh blast-radius \
  --contract harness.contract.json \
  --files "src/core/types.ts"

# 2. Lint passes
pnpm lint

# 3. Typecheck passes
pnpm typecheck

# 4. Smoke tests pass (skip pre-existing known failures)
pnpm exec vitest run src/ui
```

If any of these fail, see [Known biome.json regressions](#known-biomejson-regressions)
or run [Rollback](#rollback).

## Rollback

If the update breaks something and you cannot quickly fix it:

```bash
bash scripts/harness-cli.sh init --rollback
```

This restores files from `.harness/restore-manifest.json`. Only works if `--track`
was used during the update.

## CI failure: contract validation errors

**Symptom:** `harness-gates` Authorization gate fails with:
`ContractLoadError: Contract validation failed with N error(s)`

**Cause:** `harness.contract.json` schema version does not match the installed
harness package version.

**Fix:**

```bash
test -f .harness/restore-manifest.json || bash scripts/harness-cli.sh init --track
bash scripts/harness-cli.sh init --update
bash scripts/harness-cli.sh init --migrate
pnpm lint && pnpm typecheck
```

Then commit and push.

## Known biome.json regressions

The harness template ships a `biome.json` compatible with Biome v1.x.
This project uses Biome v2.x. After `--update`, you **must** fix the following:

### 1. Run biome migrate

```bash
pnpm exec biome migrate --write
```

### 2. Restore the CSS parser block (dropped by biome migrate)

`biome migrate` drops the `css` block. Re-add it manually to `biome.json`
after the `"files"` block:

```json
"css": {
  "parser": {
    "cssModules": true,
    "allowWrongLineComments": true
  },
  "linter": {
    "enabled": true
  }
},
```

### 3. Restore src/styles.css exclusion

`biome migrate` drops the `!src/styles.css` exclusion from `files.includes`.
`src/styles.css` uses Tailwind v4 `@import`/`@theme` syntax that Biome rejects.
Re-add it:

```json
"files": {
  "includes": [
    "**",
    "!**/node_modules",
    "!**/dist",
    "!**/coverage",
    "!**/artifacts",
    "!src/styles.css"
  ]
}
```

### 4. Restore Storybook noDefaultExport override

Add `*.stories.tsx` and `*.stories.ts` to the `noDefaultExport: "off"` override
alongside the config file patterns.

```json
"overrides": [
  {
    "includes": [
      "**/*.config.ts",
      "**/vite.config.ts",
      "**/vitest.config.ts",
      "**/*.stories.tsx",
      "**/*.stories.ts"
    ],
    "linter": {
      "rules": {
        "style": { "noDefaultExport": "off" }
      }
    }
  }
]
```

After all fixes, re-run `pnpm lint` to confirm 0 errors.
