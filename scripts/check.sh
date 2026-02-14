#!/usr/bin/env bash
set -euo pipefail

if [[ -f pyproject.toml ]]; then
  if command -v uv >/dev/null 2>&1; then
    uv run ruff check . || true
    uv run mypy --strict src/ || true
    uv run pytest -q
  else
    echo "uv not found" >&2
    exit 1
  fi
elif [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm -s lint --if-present
    pnpm -s typecheck --if-present
    pnpm -s test --if-present
  else
    npm run -s lint --if-present
    npm run -s typecheck --if-present
    npm test --silent --if-present
  fi
else
  echo "No known project type in $(pwd)" >&2
  exit 1
fi
