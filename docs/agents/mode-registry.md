# Mode Registry

## Table of Contents

- [Current Contract](#current-contract)
- [Mode Map](#mode-map)
- [Contract Status](#contract-status)
- [Current Product Posture](#current-product-posture)

## Current Contract

This registry tracks the active shell contract after the IA cleanup.

The visible primary navigation is a flat six-item list:

- `dashboard` -> `Narrative Brief`
- `repo` -> `Repo Evidence`
- `sessions` -> `Sessions`
- `tools` -> `Tools`
- `hygiene` -> `Hygiene`
- `settings` -> `Settings`

`ViewSection` remains internal metadata for framing and grouping decisions inside the shell, but it is not a visible sidebar-grouping contract.

`Settings` now owns both operator configuration and repository docs access. `DocsView` and the hidden legacy shell routes are no longer part of the canonical runtime contract.

## Mode Map

| Mode | Family | Primary nav visibility | Metadata section | Current label |
| :--- | :--- | :--- | :--- | :--- |
| `dashboard` | Anchor | Visible | Narrative | `Narrative Brief` |
| `repo` | Anchor | Visible | Workspace | `Repo Evidence` |
| `sessions` | Surface | Visible | Evidence | `Sessions` |
| `tools` | Surface | Visible | Integrations | `Tools` |
| `hygiene` | Surface | Visible | Health | `Hygiene` |
| `settings` | Surface | Visible | Configure | `Settings` |

## Contract Status

- [x] Flat six-item primary navigation is the shell contract
- [x] `Mode` is reduced to the six canonical lanes
- [x] `AnchorMode` is reduced to `dashboard | repo`
- [x] `SurfaceMode` is reduced to `sessions | tools | hygiene | settings`
- [x] Docs access lives inside `settings`
- [x] Legacy shell-route ownership maps are removed from runtime navigation

## Current Product Posture

The shell is currently Codex-first.

That means:

- the dashboard and repo lanes should privilege Codex narrative evidence workflows
- hygiene should frame trust, environment, setup, and capture review as operational follow-through inside one lane
- settings should remain a narrow configuration and docs access lane, not a second broad shell taxonomy
