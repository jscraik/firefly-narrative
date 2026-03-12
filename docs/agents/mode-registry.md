# Mode Registry

## Table of Contents

- [Mode Map](#mode-map)
- [Contract Status](#contract-status)
- [Current Product Posture](#current-product-posture)

## Mode Map

This registry tracks the mapping between `Mode` values and their view family and section in the redesigned Trace Narrative shell.

| Mode | Family | Section | Current label |
| :--- | :--- | :--- | :--- |
| `dashboard` | Anchor | Narrative | Narrative Brief |
| `work-graph` | Surface | Narrative | Story Map |
| `assistant` | Surface | Narrative | Codex Copilot |
| `live` | Surface | Evidence | Live Capture |
| `sessions` | Surface | Evidence | Sessions |
| `transcripts` | Surface | Evidence | Transcript Lens |
| `tools` | Surface | Evidence | Tool Pulse |
| `costs` | Surface | Evidence | Cost Watch |
| `timeline` | Surface | Evidence | Causal Timeline |
| `repo` | Anchor | Workspace | `Repo Evidence` |
| `repo-pulse` | Surface | Workspace | Workspace Pulse |
| `diffs` | Surface | Workspace | Diff Review |
| `snapshots` | Surface | Workspace | Checkpoints |
| `worktrees` | Surface | Workspace | `Worktrees` |
| `attribution` | Surface | Workspace | Attribution Lens |
| `skills` | Surface | Integrations | Codex Skills |
| `agents` | Surface | Integrations | Agent Roles |
| `memory` | Surface | Integrations | Memory Graph |
| `hooks` | Surface | Integrations | Hooks |
| `setup` | Surface | Integrations | Setup |
| `ports` | Surface | Integrations | Ports |
| `hygiene` | Surface | Health | Hygiene |
| `deps` | Surface | Health | Dependency Watch |
| `env` | Surface | Health | `Env Hygiene` |
| `status` | Surface | Health | Trust Center |
| `docs` | Anchor | Configure | Docs |
| `settings` | Surface | Configure | Settings |

## Contract Status

- [x] Anchor-mode shell preserved
- [x] Section taxonomy updated to narrative-first labels
- [x] Hygiene and Settings retained as first-class views
- [x] Signature provenance visualization added to shared narrative surfaces
- [ ] Multi-provider shell expansion after Codex-first stabilization

## Current Product Posture

The shell is currently Codex-first.

That means:

- the dashboard and assistant copy should privilege Codex workflows
- other providers may still exist in the system, but they are not the primary shell story yet
- future provider expansion should happen after the Codex narrative flow is clearly trustworthy
