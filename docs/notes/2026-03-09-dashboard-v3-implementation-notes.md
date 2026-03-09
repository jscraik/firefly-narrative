# Dashboard v3 Implementation Notes

## Spec Sections to Delivery Checkpoints

| Spec Section                                   | Phase/Checkpoint | Details |
| ---------------------------------------------- | ---------------- | ------- |
| State machine & trust overlay                  | Phase 1 & 2      | `DashboardState` top-level model, `DashboardTrustState` overlay, precedence rule enforcement. |
| Redaction & permission-safe residual content   | Phase 4 & 5      | Immediate concealment on `permission_denied`, aggregate-safe residual cards. |
| Release-blocking events & metrics              | Phase 4          | Extension of `narrativeTelemetry.ts` envelope, release-blocking event schema enforcement (`dashboard_retry_budget_exhausted`, etc.). |
| Artifact pack & rollback runbook               | Phase 7          | Canonical `artifacts/rollout/dashboard-v3/` generation, strict schema validation, rollback timeline and triggers. |

## Rollout Cohort Table

- **Stage A**: Internal maintainers / explicit opt-in cohort (`<=5%`) behind `dashboard_v3_layout`.
- **Stage B**: 25% cohort (Proceeds only after Stage A completes 24h + day2-7 evidence + 2 consecutive passing windows).
- **Stage C**: 100% cohort (Proceeds only after Stage B completes 24h + day2-7 evidence + 2 consecutive passing windows).

## Artifact Roots

- `artifacts/rollout/dashboard-v3/`
- `artifacts/release/codex-app-server/`
- `artifacts/test/`

*Verified that scripts exist in `package.json` to generate and verify these artifacts.*

## Dependency Baseline

`echarts-canvas` (or the underlying `echarts` dependency) was absent from `package.json`.
Before Phase 3 begins, `pnpm add echarts` must be installed.
*Bundle Delta Review Note*: Adding `echarts` will increase the JavaScript bundle size. The visualization component should be lazy-loaded if possible, or isolated so that the `svg_low_density` and `table_accessible_fallback` paths aren't burdened by the canvas renderer load time. We will compare `pnpm build` output before and after adding `echarts` for the baseline.
