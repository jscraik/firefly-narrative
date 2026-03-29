#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
fallback_cli="${repo_root%/*}/coding-harness/dist/cli.js"

cli_path="$(node -p "(() => { try { return require(\"fs\").realpathSync(require.resolve(\"@brainwav/coding-harness/dist/cli.js\")); } catch { return \"\"; } })()")"

if [[ -z "${cli_path}" ]]; then
	if [[ -f "${fallback_cli}" ]]; then
		cli_path="${fallback_cli}"
	else
		echo "Error: could not resolve @brainwav/coding-harness/dist/cli.js." >&2
		echo "Try restoring the local package install with 'pnpm install --ignore-scripts'." >&2
		exit 1
	fi
fi

exec node "$cli_path" "$@"
