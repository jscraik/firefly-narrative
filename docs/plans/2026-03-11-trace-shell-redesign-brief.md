# Trace Shell Redesign Brief

## Table of Contents

- [Goal](#goal)
- [Constraints](#constraints)
- [New Information Architecture](#new-information-architecture)
- [Screen Direction](#screen-direction)
- [Phase 1 Deliverables](#phase-1-deliverables)
- [Deferred Work](#deferred-work)

## Goal

Redesign the Trace Narrative shell so it keeps the strong desktop layout and calm operator tone, while becoming clearly about narrative evidence rather than generic AI monitoring.

## Constraints

- Keep the sidepanel layout.
- Keep the Hygiene view.
- Keep the Settings dashboard.
- Avoid blatant visual or structural plagiarism of Readout.
- Make the current phase Codex-first.
- Use real signals where possible; do not invent certainty.

## New Information Architecture

The shell keeps its six grouped columns of meaning, but the labels become product-specific.

- `Narrative`: story framing and explanation surfaces
- `Evidence`: sessions, live capture, transcripts, tools, costs, causal timeline
- `Workspace`: repo evidence, diffs, snapshots, worktrees, attribution
- `Integrations`: skills, agents, memory, hooks, setup, ports
- `Health`: hygiene, dependency watch, env hygiene, trust center
- `Configure`: docs and settings

## Screen Direction

### Narrative Brief

The landing screen should feel like a branch brief, not a KPI wall.

Required content:

- a narrative headline grounded in the selected repo and time window
- a short evidence summary using real stats
- an explicit next move
- metrics that describe commits, attribution, evidence volume, and primary tool
- quick actions that privilege repo evidence, Codex session import, and hygiene review

### Repo Evidence

Repo stays the primary deep-reading surface.

Direction:

- emphasize commit-linked files and evidence trails
- make surface actions drop into repo evidence cleanly
- treat repo mode as the place where claims are verified

### Story Map

This remains a high-level workspace navigator.

Direction:

- show which repos deserve attention
- avoid turning into a generic org chart
- keep the language about story pressure, drift, and next move

### Codex Copilot

Assistant should be framed as a guided narrative copilot, not a provider switchboard.

Direction:

- Codex-first copy
- suggested asks tied to evidence
- safe action framing
- provider expansion positioned as later, explicit work

### Evidence Views

`Live Capture`, `Sessions`, `Transcript Lens`, `Tool Pulse`, `Cost Watch`, and `Causal Timeline` should collectively answer how evidence enters and supports the narrative.

Direction:

- distinguish observed capture from inferred summaries
- use trust cues consistently
- keep costs and tooling secondary to evidence usefulness

### Hygiene

Keep this as a signature operational view.

Direction:

- cautious language
- explicit blast-radius framing
- cleanup suggestions that feel safe and reversible

### Settings

Keep this as a serious dashboard, but clarify that it controls the operator contract.

Direction:

- Codex-first source posture
- scan scope clarity
- budget and trust settings visible
- no vague provider sprawl in the primary copy

### Docs

Docs should reinforce the current product identity and remove stale naming drift.

Direction:

- no Firefly naming
- frame docs as operational guidance for Trace Narrative
- support the Codex-first rollout story

## Phase 1 Deliverables

- rename the shell taxonomy
- replace dashboard greeting with a narrative brief
- remove fake dashboard metrics
- make quick actions Codex-first
- align assistant/settings copy with Codex-first rollout
- add a vision document to prevent future shell drift

## Deferred Work

- deeper repo-anchor provenance visualization inside `Repo Evidence`
- provider-expansion UX beyond Codex
- deeper repo/docs onboarding states
- broader shell and landing-page visual system cleanup
