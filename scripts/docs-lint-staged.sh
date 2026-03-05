#!/usr/bin/env bash
set -euo pipefail

staged_files="$(git diff --cached --name-only --diff-filter=ACMR)"

if [[ -z "${staged_files}" ]]; then
  echo "docs-lint-staged: no staged files; skipping docs lint"
  exit 0
fi

doc_targets=(
  "README.md"
  "docs/README.md"
  "brand/README.md"
)

should_run=0

while IFS= read -r file; do
  if [[ "${file}" == "docs/agents/"*".md" ]]; then
    should_run=1
    break
  fi

  for target in "${doc_targets[@]}"; do
    if [[ "${file}" == "${target}" ]]; then
      should_run=1
      break
    fi
  done

  if [[ "${should_run}" -eq 1 ]]; then
    break
  fi
done <<< "${staged_files}"

if [[ "${should_run}" -eq 0 ]]; then
  echo "docs-lint-staged: no staged docs-lint targets; skipping docs lint"
  exit 0
fi

echo "docs-lint-staged: staged docs files detected; running pnpm docs:lint"
pnpm docs:lint
