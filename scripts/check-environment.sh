#!/usr/bin/env bash
# Local environment check for firefly-narrative.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONTRACT_PATH="$REPO_ROOT/harness.contract.json"

cd "$REPO_ROOT"

echo "== Firefly environment check =="

if [[ ! -f "$REPO_ROOT/scripts/codex-preflight.sh" ]]; then
	echo "Error: scripts/codex-preflight.sh is missing." >&2
	exit 1
fi

# shellcheck source=/dev/null
source "$REPO_ROOT/scripts/codex-preflight.sh"
preflight_repo \
	firefly-narrative \
	"git,bash,sed,rg,fd,jq,node,pnpm,python3" \
	"AGENTS.md,package.json,harness.contract.json,src,src-tauri,scripts"

require_bin() {
	local bin_name="$1"
	local install_hint="$2"
	if ! command -v "$bin_name" >/dev/null 2>&1; then
		echo "Error: missing '$bin_name'. $install_hint" >&2
		exit 1
	fi
}

require_bin rustup "Install Rust toolchain via rustup."
require_bin rustc "Install Rust toolchain via rustup."
require_bin cargo "Install Rust toolchain via rustup."

if [[ ! -f "$CONTRACT_PATH" ]]; then
	echo "Error: missing contract file at $CONTRACT_PATH" >&2
	exit 1
fi

if [[ ! -d "$REPO_ROOT/node_modules" ]]; then
	echo "Error: node_modules missing. Run 'pnpm install' first." >&2
	exit 1
fi

echo "Checking Tauri CLI..."
pnpm exec tauri --version >/dev/null

echo "Checking harness CLI..."
pnpm exec harness --version >/dev/null

echo "Running harness preflight gate..."
pnpm exec harness preflight-gate --contract "$CONTRACT_PATH"

echo "Environment check passed!"
