#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Load local env if present
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

export PORT="${PORT:-8787}"
export TRIGGER_EVENTS="${TRIGGER_EVENTS:-submit}"

cleanup() {
  if [ -n "${AUTOPILOT_PID:-}" ]; then kill "$AUTOPILOT_PID" >/dev/null 2>&1 || true; fi
  if [ -n "${MCP_PID:-}" ]; then kill "$MCP_PID" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT INT TERM

# Stop stale local listeners for this repo flow
pkill -f "agentation-mcp server --port 4747" >/dev/null 2>&1 || true
pkill -f "node scripts/agentation-autopilot.mjs" >/dev/null 2>&1 || true

pnpm agentation:mcp &
MCP_PID=$!

PORT="$PORT" TRIGGER_EVENTS="$TRIGGER_EVENTS" pnpm agentation:autopilot &
AUTOPILOT_PID=$!

echo "[agentation-dev] MCP:      http://localhost:4747 (pid $MCP_PID)"
echo "[agentation-dev] Webhook:  http://localhost:${PORT} (pid $AUTOPILOT_PID)"
echo "[agentation-dev] Trigger events: ${TRIGGER_EVENTS}"

wait "$MCP_PID" "$AUTOPILOT_PID"
