# Tooling Inventory

_Generated from `harness.contract.json` by `scripts/generate-tooling-doc.sh` on 2026-04-09T14:44:48Z._

## Table of Contents

- [Scope](#scope)
- [Required .mise [tools]](#required-mise-tools)
- [Required Binaries](#required-binaries)
- [Required Codex Actions](#required-codex-actions)
- [Required Tooling Terms](#required-tooling-terms)
- [Regeneration](#regeneration)

## Scope

This document is the repo-owned tooling inventory for environment checks.
It covers exactly the lists enforced by `scripts/check-environment.sh`:

- required `.mise.toml` `[tools]` entries
- required binaries on `PATH`
- required Codex action names/icons in `.codex/environments/environment.toml`

## Required .mise [tools]

| Tool | Version |
| --- | --- |
| `node` | `24.13.1` |
| `pnpm` | `10.0.0` |
| `python` | `3.12` |
| `uv` | `0.10.9` |
| `cargo:prek` | `0.3.4` |
| `npm:@brainwav/diagram` | `1.0.8` |
| `npm:@argos-ci/cli` | `4.1.1` |
| `cosign` | `3.0.5` |
| `cloudflared` | `2026.3.0` |
| `npm:vitest` | `4.0.18` |
| `ruff` | `0.15.5` |
| `npm:eslint` | `10.0.3` |
| `npm:agent-browser` | `0.17.1` |
| `npm:agentation` | `2.3.2` |
| `npm:agentation-mcp` | `1.2.0` |
| `npm:@mermaid-js/mermaid-cli` | `11.12.0` |
| `npm:@brainwav/rsearch` | `0.1.6` |
| `npm:@brainwav/wsearch-cli` | `0.1.9` |
| `npm:beautiful-mermaid` | `1.1.3` |
| `npm:markdownlint-cli2` | `0.21.0` |
| `npm:semver` | `7.7.4` |
| `npm:wrangler` | `4.69.0` |
| `semgrep` | `1.153.1` |
| `trivy` | `0.69.3` |
| `vale` | `3.13.1` |

## Required Binaries

- `pnpm`
- `node`
- `jq`
- `make`
- `rg`
- `fd`
- `prek`
- `diagram`
- `mise`
- `vale`
- `argos`
- `cosign`
- `cloudflared`
- `vitest`
- `ruff`
- `eslint`
- `agent-browser`
- `agentation-mcp`
- `mmdc`
- `markdownlint-cli2`
- `wrangler`
- `beautiful-mermaid`
- `semgrep`
- `semver`
- `trivy`
- `rsearch`
- `wsearch`

## Required Codex Actions

| Action | Icon |
| --- | --- |
| `Tools` | `tool` |
| `Run` | `run` |
| `Debug` | `debug` |
| `Test` | `test` |
| `Prek` | `test` |
| `Diagram` | `tool` |
| `Ralph` | `debug` |
| `Mise` | `tool` |
| `Vale` | `debug` |
| `Argos` | `test` |
| `Cosign` | `debug` |
| `Cloudflared` | `run` |
| `Vitest` | `test` |
| `Ruff` | `debug` |
| `ESLint` | `debug` |
| `Agent Browser` | `tool` |
| `Agentation` | `tool` |
| `Mermaid CLI` | `tool` |
| `MarkdownLint` | `debug` |
| `Wrangler` | `run` |
| `1Password` | `tool` |
| `Beautiful Mermaid` | `tool` |
| `Auth0` | `tool` |
| `Semgrep` | `debug` |
| `Semver` | `tool` |
| `Trivy` | `debug` |
| `Gitleaks` | `debug` |
| `Research` | `tool` |
| `WSearch` | `tool` |

## Required Tooling Terms

The environment check asserts these terms are present in this document.

- `node`
- `pnpm`
- `python`
- `uv`
- `make`
- `rg`
- `fd`
- `jq`
- `prek`
- `diagram`
- `mise`
- `vale`
- `argos`
- `cosign`
- `cloudflared`
- `vitest`
- `ruff`
- `eslint`
- `agent-browser`
- `agentation`
- `mermaid-cli`
- `markdownlint-cli2`
- `wrangler`
- `beautiful-mermaid`
- `semgrep`
- `semver`
- `trivy`
- `rsearch`
- `wsearch`

## Regeneration

Run:

```bash
bash scripts/generate-tooling-doc.sh
```
