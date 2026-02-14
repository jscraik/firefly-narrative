#!/usr/bin/env bash
set -euo pipefail

if [[ -f pyproject.toml ]]; then
  command -v uv >/dev/null 2>&1 || { echo "uv not found" >&2; exit 1; }
  uv run pytest -q -x
elif [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm -s test --if-present
  else
    npm test --silent --if-present
  fi
else
  echo "No known project type in $(pwd)" >&2
  exit 1
fi
