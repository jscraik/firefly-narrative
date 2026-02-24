#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_DIR="${ARTIFACT_DIR:-artifacts/test}"
MODE="${1:-all}"

mkdir -p "$ARTIFACT_DIR"

run_with_log() {
  local log_file="$1"
  shift
  "$@" 2>&1 | tee "$log_file"
  return ${PIPESTATUS[0]}
}

run_unit() {
  echo "[test-with-artifacts] Running unit tests (vitest)..."
  run_with_log "$ARTIFACT_DIR/test-output-unit.log" \
    pnpm vitest run \
      --reporter=default \
      --reporter=junit \
      --reporter=json \
      --outputFile.junit="$ARTIFACT_DIR/junit-vitest.xml" \
      --outputFile.json="$ARTIFACT_DIR/vitest-results.json"
}

run_integration() {
  echo "[test-with-artifacts] Running integration tests (vitest integration config)..."
  run_with_log "$ARTIFACT_DIR/test-output-integration.log" \
    pnpm vitest run --config vite.integration.config.ts \
      --reporter=default \
      --reporter=junit \
      --reporter=json \
      --outputFile.junit="$ARTIFACT_DIR/junit-integration.xml" \
      --outputFile.json="$ARTIFACT_DIR/integration-results.json"
}

run_e2e() {
  echo "[test-with-artifacts] Running e2e tests (playwright)..."
  run_with_log "$ARTIFACT_DIR/test-output-e2e.log" \
    env TEST_ARTIFACTS=1 TEST_ARTIFACTS_DIR="$ARTIFACT_DIR" pnpm playwright test
}

case "$MODE" in
  all)
    run_unit
    run_integration
    run_e2e
    ;;
  unit)
    run_unit
    ;;
  integration)
    run_integration
    ;;
  e2e)
    run_e2e
    ;;
  *)
    echo "Usage: bash scripts/test-with-artifacts.sh [all|unit|integration|e2e]" >&2
    exit 2
    ;;
esac

echo "[test-with-artifacts] Artifacts written to $ARTIFACT_DIR"
