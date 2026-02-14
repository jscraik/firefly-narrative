#!/usr/bin/env bash
set -euo pipefail

git diff --quiet || { echo "Working tree dirty" >&2; exit 1; }
git diff --cached --quiet || { echo "Index dirty" >&2; exit 1; }

./scripts/check.sh

echo "release-check: OK"
