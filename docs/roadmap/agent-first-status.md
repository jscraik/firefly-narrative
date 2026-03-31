---
title: Agent-First Status Matrix
status: active
last_validated: 2026-03-22
---

# Agent-First Status Matrix

Tracks the operational readiness of agent-first workflows in `trace-narrative`.

## CI / Governance

| Dimension | Provider | Status |
|---|---|---|
| CI pipeline | CircleCI (`pr-pipeline`) | ✅ Active |
| PR governance gates | `harness-gates.yml` (GHA) | ✅ Active |
| Code review | Greptile | ✅ Active |
| Branch protection | GitHub Rulesets | ✅ Active |
| Harness version | `@brainwav/coding-harness@0.8.2` | ✅ Current |

## Pilot Authz

| Dimension | Setting | Status |
|---|---|---|
| Mode | `shadow` → `required` | ✅ Migrated |
| Repo allowlist | `jscraik/trace-narrative` | ✅ |
| Branch allowlist | `feature/*`, `fix/*`, `chore/*`, `refactor/*` | ✅ |
| Protected branches | `main`, `master`, `release/*` | ✅ |

## Memory / Context

| Dimension | Status |
|---|---|
| `context-health` | ✅ 75% coverage |
| `memory-gate` | ✅ Active |
| `drift-gate` | ✅ Advisory mode |
| `gardener` | ✅ Active (62 docs pending validation) |

## Roadmap

- [ ] Raise `context-health` coverage from 75% to 90%
- [ ] Validate all 62 stale docs via gardener
- [ ] Promote `ciProviderPolicy.mode` from `required` to full enforcement audit
- [ ] Seed consistency-drift baseline after next stable sprint
