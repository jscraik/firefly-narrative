#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONTRACT_PATH="$REPO_ROOT/harness.contract.json"
OUTPUT_PATH="$REPO_ROOT/docs/agents/tooling.md"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ ! -f "$CONTRACT_PATH" ]]; then
	echo "Error: missing contract file at $CONTRACT_PATH"
	exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
	echo "Error: jq is required to generate $OUTPUT_PATH"
	exit 1
fi

required_mise_count="$(jq -er '.toolingPolicy.requiredMiseTools | length' "$CONTRACT_PATH")"
required_bins_count="$(jq -er '.toolingPolicy.requiredBinaries | length' "$CONTRACT_PATH")"
required_actions_count="$(jq -er '.toolingPolicy.codexEnvironment.requiredActions | length' "$CONTRACT_PATH")"
required_terms_count="$(jq -er '.toolingPolicy.requiredDocumentationTerms | length' "$CONTRACT_PATH")"

if [[ "$required_mise_count" -eq 0 || "$required_bins_count" -eq 0 || "$required_actions_count" -eq 0 || "$required_terms_count" -eq 0 ]]; then
	echo "Error: toolingPolicy arrays in $CONTRACT_PATH must be non-empty before generating docs"
	exit 1
fi

{
	echo "# Tooling Inventory"
	echo
	echo "_Generated from \`harness.contract.json\` by \`scripts/generate-tooling-doc.sh\` on ${GENERATED_AT}._"
	echo
	echo "## Table of Contents"
	echo "- [Scope](#scope)"
	echo "- [Required .mise [tools]](#required-mise-tools)"
	echo "- [Required Binaries](#required-binaries)"
	echo "- [Required Codex Actions](#required-codex-actions)"
	echo "- [Required Tooling Terms](#required-tooling-terms)"
	echo "- [Regeneration](#regeneration)"
	echo
	echo "## Scope"
	echo "This document is the repo-owned tooling inventory for environment checks."
	echo "It covers exactly the lists enforced by \`scripts/check-environment.sh\`:"
	echo "- required \`.mise.toml\` \`[tools]\` entries"
	echo "- required binaries on \`PATH\`"
	echo "- required Codex action names/icons in \`.codex/environments/environment.toml\`"
	echo
	echo "## Required .mise [tools]"
	echo "| Tool | Version |"
	echo "| --- | --- |"
	jq -r '.toolingPolicy.requiredMiseTools[] | "| `\(.tool)` | `\(.version)` |"' "$CONTRACT_PATH"
	echo
	echo "## Required Binaries"
	jq -r '.toolingPolicy.requiredBinaries[] | "- `\(.)`"' "$CONTRACT_PATH"
	echo
	echo "## Required Codex Actions"
	echo "| Action | Icon |"
	echo "| --- | --- |"
	jq -r '.toolingPolicy.codexEnvironment.requiredActions[] | "| `\(.name)` | `\(.icon)` |"' "$CONTRACT_PATH"
	echo
	echo "## Required Tooling Terms"
	echo "The environment check asserts these terms are present in this document."
	jq -r '.toolingPolicy.requiredDocumentationTerms[] | "- `\(.)`"' "$CONTRACT_PATH"
	echo
	echo "## Regeneration"
	echo "Run:"
	echo
	echo '```bash'
	echo 'bash scripts/generate-tooling-doc.sh'
	echo '```'
} > "$OUTPUT_PATH"

echo "Updated $OUTPUT_PATH"
