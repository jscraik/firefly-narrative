---
status: complete
priority: p2
issue_id: CR-015
tags:
  - code-review
  - quality
  - reliability
  - frontend
  - agentation
dependencies: []
---

## Problem Statement
Strict browser audit found console errors and failed network requests in a standard local run when the Agentation service is unavailable. This creates noisy error telemetry and can hide real regressions.

## Findings
- Browser audit captured two console errors and two failed fetch requests.
- Failing endpoints were `http://localhost:4747/health` and `http://localhost:4747/sessions`.
- Runtime emitted warning fallback to local storage, but errors still surface in console as hard failures.

### Evidence
- Report: `/Users/jamiecraik/dev/firefly-narrative/docs/assets/verification/browser-audit-2026-02-24/browser-audit-report.json`
- Screenshots:
  - `/Users/jamiecraik/dev/firefly-narrative/docs/assets/verification/browser-audit-2026-02-24/01-home.png`
  - `/Users/jamiecraik/dev/firefly-narrative/docs/assets/verification/browser-audit-2026-02-24/02-repo.png`
  - `/Users/jamiecraik/dev/firefly-narrative/docs/assets/verification/browser-audit-2026-02-24/03-demo-timeline.png`

## Proposed Solutions
### Option 1 (Recommended): Feature-gate Agentation network calls unless service enabled
- **Effort:** Small
- **Risk:** Low
- **Pros:** Removes expected-no-service error noise in default dev/test runs.
- **Approach:** Add explicit env/config gate and skip health/session calls when disabled.

### Option 2: Downgrade expected connection failures to debug-level logs
- **Effort:** Small
- **Risk:** Low
- **Pros:** Preserves fallback behavior while reducing console error noise.
- **Approach:** Catch `ERR_CONNECTION_REFUSED` and suppress error-level logging.

### Option 3: Start local stub service in dev/test harness
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** Exercises full integration paths consistently.
- **Approach:** Add lightweight local mock on port 4747 for CI/local e2e.

## Recommended Action

## Technical Details
- Area: frontend startup/session initialization path for Agentation integration.
- Impact: strict browser quality checks fail due to expected missing local dependency.

## Acceptance Criteria
- [x] Default local run does not emit console error events for expected missing Agentation service.
- [x] Network failure handling is explicit and documented.
- [x] Strict browser baseline test reports zero MCP request failures and zero MCP console errors.

## Work Log
- 2026-02-24: Added from strict browser pass after detecting connection-refused errors to localhost:4747.
- 2026-02-24: Fixed by gating Agentation panel on `VITE_AGENTATION_ENDPOINT`; added baseline Playwright guard test (`e2e/agentation-baseline.spec.ts`) and verified full e2e pass.

## Resources
- `/Users/jamiecraik/dev/firefly-narrative/docs/assets/verification/browser-audit-2026-02-24/browser-audit-report.json`
