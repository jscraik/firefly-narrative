#!/usr/bin/env bash

if [[ -z "${BASH_VERSION:-}" ]]; then
  printf "❌ verify-work.sh requires bash. Run: bash scripts/verify-work.sh [options]\n" >&2
  return 2 2>/dev/null || exit 2
fi

if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
  printf "❌ verify-work.sh is CLI-only; do not source it. Run: bash scripts/verify-work.sh [options]\n" >&2
  return 2
fi

set -euo pipefail

repo_root=""
fast_mode=0
hook_governance_scope="project-local"

declare -a passed_checks=()
declare -a failed_checks=()
declare -a skipped_checks=()
declare -a temp_paths=()

usage() {
  cat <<'USAGE'
Usage: verify-work.sh [options]

Local hook-governance verification runner.

Options:
  --fast                  Keep checks focused on hook-governance scope defaults
  --repo-root PATH        Run checks in a specific repository root (default: script's own repo)
  --project-governance    Limit hook-governance checks to the current git repo (default)
  --workspace-governance  Run hook-governance checks for all repos in repo-scope.manifest.json
  -h, --help              Show this help text
USAGE
}

cleanup_temp_paths() {
  local path=""
  for path in "${temp_paths[@]}"; do
    [[ -n "$path" ]] || continue
    rm -f "$path"
  done
}
trap cleanup_temp_paths EXIT

run_check() {
  local name="$1"
  shift
  echo
  echo "==> $name"
  if "$@"; then
    passed_checks+=("$name")
  else
    failed_checks+=("$name")
  fi
}

skip_check() {
  local name="$1"
  local reason="$2"
  skipped_checks+=("$name ($reason)")
  echo "[verify-work] skip $name: $reason"
}

build_project_local_manifest() {
  local out_path="$1"
  local workspace_root="$2"
  local repo_name="$3"
  python3 - "$out_path" "$workspace_root" "$repo_name" <<'PY'
import json
import sys
from pathlib import Path

out = Path(sys.argv[1])
workspace_root = sys.argv[2]
repo_name = sys.argv[3]
payload = {
    "workspace_root": workspace_root,
    "repos": {
        "in_scope": [repo_name],
        "excluded": [],
    },
}
out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

while (($# > 0)); do
  case "$1" in
    --fast)
      fast_mode=1
      shift
      ;;
    --repo-root)
      repo_root="${2:-}"
      shift 2
      ;;
    --project-governance)
      hook_governance_scope="project-local"
      shift
      ;;
    --workspace-governance)
      hook_governance_scope="workspace"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[verify-work] unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

script_repo_root="$(cd -P "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ -z "$repo_root" ]]; then
  repo_root="$script_repo_root"
fi

cd "$repo_root"
echo "[verify-work] repo root: $repo_root"

current_git_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
current_repo_name="$(basename "$current_git_root")"
workspace_root="$(dirname "$current_git_root")"

if [[ "$fast_mode" -eq 1 ]]; then
  echo "[verify-work] fast mode enabled"
fi

inventory_script="scripts/hook-governance/inventory_repos.py"
classifier_script="scripts/hook-governance/classify_public_api.py"
rollout_script="scripts/hook-governance/rollout_check.py"
docstring_script="scripts/hook-governance/evaluate_docstring_ratchet.py"

if [[ ! -f "$inventory_script" || ! -f "$classifier_script" || ! -f "$rollout_script" || ! -f "$docstring_script" ]]; then
  echo "[verify-work] missing one or more hook-governance scripts" >&2
  exit 1
fi

manifest_path=""
inventory_output=""
classification_output=""
rollout_output=""
docstring_output=""
metrics_input="docs/hooks-governance/docstring-ratchet-metrics.json"

if [[ "$hook_governance_scope" == "project-local" ]]; then
  manifest_path="$(mktemp "${TMPDIR:-/tmp}/verify-work-hook-scope.XXXXXX.json")"
  temp_paths+=("$manifest_path")
  build_project_local_manifest "$manifest_path" "$workspace_root" "$current_repo_name"

  inventory_output="$(mktemp "${TMPDIR:-/tmp}/verify-work-repo-profile-matrix.XXXXXX.json")"
  classification_output="$(mktemp "${TMPDIR:-/tmp}/verify-work-public-api-classification.XXXXXX.json")"
  rollout_output="$(mktemp "${TMPDIR:-/tmp}/verify-work-rollout-check-report.XXXXXX.json")"
  docstring_output="$(mktemp "${TMPDIR:-/tmp}/verify-work-docstring-ratchet-report.XXXXXX.json")"
  temp_paths+=("$inventory_output" "$classification_output" "$rollout_output" "$docstring_output")

  echo "[verify-work] hook-governance scope: project-local (repo=$current_repo_name)"
else
  manifest_path="docs/hooks-governance/repo-scope.manifest.json"
  inventory_output="docs/hooks-governance/repo-profile-matrix.json"
  classification_output="docs/hooks-governance/public-api-classification.json"
  rollout_output="docs/hooks-governance/rollout-check-report.json"
  docstring_output="docs/hooks-governance/docstring-ratchet-report.json"
  echo "[verify-work] hook-governance scope: workspace"
fi

if [[ ! -f "$manifest_path" ]]; then
  echo "[verify-work] missing scope manifest: $manifest_path" >&2
  exit 1
fi

if [[ ! -f "$metrics_input" ]]; then
  skip_check "hook-governance-docstring-ratchet" "missing metrics input: $metrics_input"
else
  run_check "hook-governance-inventory" \
    python3 "$inventory_script" --manifest "$manifest_path" --out "$inventory_output"

  run_check "hook-governance-public-api-classification" \
    python3 "$classifier_script" --inventory "$inventory_output" --out "$classification_output"

  run_check "hook-governance-rollout-check" \
    python3 "$rollout_script" \
      --inventory "$inventory_output" \
      --recovery-slo-hours 24 \
      --out "$rollout_output"

  run_check "hook-governance-docstring-ratchet" \
    python3 "$docstring_script" \
      --classification "$classification_output" \
      --metrics "$metrics_input" \
      --window-days 14 \
      --out "$docstring_output"
fi

echo
echo "=== verify-work summary ==="
echo "passed:  ${#passed_checks[@]}"
for item in "${passed_checks[@]}"; do
  echo "  - $item"
done

echo "skipped: ${#skipped_checks[@]}"
for item in "${skipped_checks[@]}"; do
  echo "  - $item"
done

echo "failed:  ${#failed_checks[@]}"
for item in "${failed_checks[@]}"; do
  echo "  - $item"
done

if [[ ${#failed_checks[@]} -gt 0 ]]; then
  exit 1
fi
