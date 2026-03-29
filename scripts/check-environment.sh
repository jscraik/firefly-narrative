#!/usr/bin/env bash
# Local environment preflight (strict)
# Fails fast when required tooling is missing.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONTRACT_PATH="$REPO_ROOT/harness.contract.json"
ATTESTATION_PATH="$REPO_ROOT/artifacts/policy/environment-attestation.json"
MISE_PATH="$REPO_ROOT/.mise.toml"
TOOLING_DOC_PATH="${TOOLING_DOC_PATH:-$HOME/dev/config/codex/instructions/tooling.md}"

if [[ ! -f "$CONTRACT_PATH" ]]; then
	echo "Error: missing contract file at $CONTRACT_PATH"
	exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
	echo "Error: required binary 'rg' is not installed or not on PATH"
	exit 1
fi

if [[ ! -f "$MISE_PATH" ]]; then
	echo "Error: missing mise config at $MISE_PATH"
	exit 1
fi

required_mise_tools=(node pnpm python uv)
for tool in "${required_mise_tools[@]}"; do
	if ! rg -q "^[[:space:]]*${tool}[[:space:]]*=" "$MISE_PATH"; then
		echo "Error: required tool '$tool' is not pinned in $MISE_PATH [tools]"
		echo "Fix: add '$tool = "<version>"' to $MISE_PATH."
		exit 1
	fi
done

if [[ -f "$TOOLING_DOC_PATH" ]]; then
	required_tooling_doc_terms=(node pnpm python uv rg fd jq)
	for term in "${required_tooling_doc_terms[@]}"; do
		if ! rg -qi "(^|[^A-Za-z0-9_-])${term}([^A-Za-z0-9_-]|$)" "$TOOLING_DOC_PATH"; then
			echo "Error: tooling doc missing expected term '$term': $TOOLING_DOC_PATH"
			echo "Fix: update tooling inventory and keep it aligned with $MISE_PATH."
			echo "Interactive flow: run a Codex AskQuestion/request_user_input prompt before applying installs."
			exit 1
		fi
	done
else
	echo "Warning: tooling doc not found at $TOOLING_DOC_PATH; skipping doc sync check."
fi

required_bins=(pnpm node jq rg fd)
for bin in "${required_bins[@]}"; do
	if ! command -v "$bin" >/dev/null 2>&1; then
		echo "Error: required binary '$bin' is not installed or not on PATH"
		exit 1
	fi
done

mkdir -p "$REPO_ROOT/artifacts/policy"

echo "Running harness environment preflight..."
pnpm exec tsx src/cli.ts check-environment \
	--contract "$CONTRACT_PATH" \
	--json \
	--attestation "$ATTESTATION_PATH"

jq -e '.passed == true' "$ATTESTATION_PATH" >/dev/null
echo "Environment check passed (attestation: $ATTESTATION_PATH)"
