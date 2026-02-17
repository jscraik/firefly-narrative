#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Prevent Vite from opening a browser tab
export BROWSER=none

# Ensure old dev runners don't conflict
pkill -f "tauri dev|vite|target/debug/narrative-desktop-mvp" >/dev/null 2>&1 || true

pnpm tauri:dev
