# Trace Narrative Vision

## Table of Contents

- [Purpose](#purpose)
- [What We Keep](#what-we-keep)
- [What We Reject](#what-we-reject)
- [Product Shape](#product-shape)
- [Information Architecture](#information-architecture)
- [Codex-First Phase](#codex-first-phase)
- [Anti-Drift Guardrails](#anti-drift-guardrails)

## Purpose

Trace Narrative should feel like a serious desktop tool for reconstructing what changed, why it changed, and how much evidence supports that story.

The app is not a generic AI operations cockpit. Its differentiator is narrative trust:

- connect sessions to commits
- separate observed facts from inferred conclusions
- make confidence and ambiguity visible
- guide the next inspection step without pretending to know more than the evidence supports

## What We Keep

These are deliberate strengths and should remain part of the product:

- the left sidepanel layout and disciplined desktop shell
- the Hygiene view as a first-class operational surface
- the Settings dashboard as the operator contract for capture, trust, and scope
- the calm, dark, information-dense posture inspired by mature operator tools

## What We Reject

We should not drift back into a Readout-shaped clone.

That means avoiding:

- copying another product's information architecture
- copying another product's dashboard cadence card-for-card
- treating generic system metrics as the primary story on the landing screen
- using placeholder certainty such as fake health or linkage numbers

Reference influence is allowed at the principle level only:

- calm density
- disciplined layout
- restrained chrome
- high trust visual tone

## Product Shape

Trace Narrative should read as an evidence workstation.

The first question on screen should always be some version of:

- what changed
- what evidence supports that conclusion
- what is still uncertain
- what should I inspect next

## Information Architecture

The shell keeps its six grouped columns of meaning, but the labels become Trace-native.

- `Narrative`
- `Evidence`
- `Workspace`
- `Integrations`
- `Health`
- `Configure`

Primary labels in this phase:

- `Narrative Brief`
- `Story Map`
- `Codex Copilot`
- `Live Capture`
- `Causal Timeline`
- `Repo Evidence`
- `Hygiene`
- `Trust Center`
- `Settings`

## Codex-First Phase

We are explicitly optimizing the shell for Codex first.

That means:

- the first trustworthy import and narrative path must work with Codex before expanding provider emphasis
- UI copy should present Codex as the baseline workflow
- additional providers may exist in the product, but they should not dominate the shell language yet
- provider expansion is a later phase, not the current identity

## Anti-Drift Guardrails

Use these rules whenever the shell or dashboard is being changed:

1. Preserve structure only when it serves Trace Narrative's story.
2. Prefer real evidence over attractive placeholder metrics.
3. If a new screen could belong to any generic AI dashboard, it is too vague.
4. Keep Hygiene and Settings useful, cautious, and operator-facing.
5. Treat outside visual references as influence, not templates.
6. When in doubt, ask whether the screen increases narrative trust.
