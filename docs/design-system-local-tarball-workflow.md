# Local Design System Tarball Workflow

Use this workflow to refresh Narrative with local DesignSystem packages.

## Prerequisites

Set local paths once per terminal:

```bash
export DESIGN_SYSTEM_ROOT="${DESIGN_SYSTEM_ROOT:-$HOME/dev/DesignSystem}"
export NARRATIVE_ROOT="${NARRATIVE_ROOT:-$(pwd)}"
```

> Run the commands below from anywhere after setting these vars.

## 1) Build DesignSystem packages

```bash
cd "$DESIGN_SYSTEM_ROOT"
pnpm -C packages/runtime build
pnpm -C packages/tokens build
pnpm -C packages/ui build
```

## 2) Pack deterministic tarballs into Narrative

```bash
mkdir -p "$NARRATIVE_ROOT/vendor/design-studio"

cd "$DESIGN_SYSTEM_ROOT/packages/runtime"
pnpm pack --pack-destination "$NARRATIVE_ROOT/vendor/design-studio"

cd "$DESIGN_SYSTEM_ROOT/packages/tokens"
pnpm pack --pack-destination "$NARRATIVE_ROOT/vendor/design-studio"

cd "$DESIGN_SYSTEM_ROOT/packages/ui"
pnpm pack --pack-destination "$NARRATIVE_ROOT/vendor/design-studio"
```

Expected files:

- `design-studio-runtime-2.0.0.tgz`
- `design-studio-tokens-2.0.0.tgz`
- `design-studio-ui-0.0.1.tgz`

## 3) Install/update in Narrative

```bash
cd "$NARRATIVE_ROOT"
pnpm install
```

`package.json` pins tarballs with repo-relative `file:vendor/design-studio/*.tgz` dependencies.

## 4) Validate integration

```bash
cd "$NARRATIVE_ROOT"
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

Optional runtime smoke:

```bash
cd "$NARRATIVE_ROOT"
pnpm dev
```

## 5) Commit checklist

Before opening a PR, ensure all tarballs are tracked:

```bash
git -C "$NARRATIVE_ROOT" status --short vendor/design-studio
```

If they are untracked, add them explicitly:

```bash
git -C "$NARRATIVE_ROOT" add vendor/design-studio/*.tgz
```
