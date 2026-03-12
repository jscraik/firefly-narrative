# Signature Provenance Visualization Plan

## Table of Contents

- [Goal](#goal)
- [Problem](#problem)
- [Design Principles](#design-principles)
- [First-Pass Scope](#first-pass-scope)
- [Component Contract](#component-contract)
- [Implementation Notes](#implementation-notes)
- [Validation](#validation)
- [Deferred Work](#deferred-work)

## Goal

Add a signature Trace Narrative visualization that makes provenance and causality legible at a glance without copying the reference app's dashboard grammar.

The first pass should make it obvious:

- what was directly observed
- what was linked from evidence
- what remains derived or inferred
- what still needs operator verification

## Problem

The redesigned shell is now calmer, more product-specific, and more trustworthy than the earlier Readout-shaped pass. What it still lacks is a distinctive visual primitive that belongs only to Trace Narrative.

The current shared surfaces explain trust and evidence in copy, but they do not yet turn provenance into a readable visual system. That leaves Story Map, Causal Timeline, and Trust Center stronger than before, but not yet memorable.

## Design Principles

1. Keep the provenance view text-backed, not image-only.
2. Separate observed, linked, derived, and unresolved states visibly.
3. Reuse the existing authority-cue contract instead of inventing a second trust language.
4. Keep the first pass shell-facing and low-risk: no canvas, no force graph, no animation-heavy custom rendering.
5. Make the operator's next safe move explicit at the end of the lane.

These choices align with current accessibility guidance for complex visuals: the visual rail should be paired with nearby textual explanation so the operator does not need to decode shape and color alone.

## First-Pass Scope

Introduce a shared `Provenance Lane` module on the non-anchor shared surfaces that most need a product-specific differentiator:

- `Story Map`
- `Causal Timeline`
- `Trust Center`

Each lane should render a left-to-right chain of four steps:

1. observed source
2. evidence join
3. derived claim
4. operator decision or verification gate

## Component Contract

The first pass should extend the shared surface view model with:

- a section eyebrow
- a section title
- a short explanatory summary
- a short operator footnote
- four provenance nodes

Each provenance node should carry:

- `eyebrow`
- `title`
- `detail`
- `state`
- `tone`
- `authorityTier`
- `authorityLabel`
- optional `edgeLabel`
- optional `action`

## Implementation Notes

- Keep the visualization card-based and responsive so it remains readable on narrower desktop layouts.
- Use the existing `AuthorityCue` chip to preserve trust semantics.
- Use a small set of node states:
  - `observed`
  - `linked`
  - `derived`
  - `review`
- Use prose beside the lane so the visual does not become the sole source of meaning.

## Validation

- `pnpm docs:lint`
- `pnpm typecheck`
- `pnpm test -- src/ui/views/__tests__/NarrativeSurfaceView.test.tsx src/ui/views/__tests__/narrativeSurfaceData.test.ts`
- `pnpm check`

## Deferred Work

- repo-anchor provenance visualization inside `Repo Evidence`
- animated or live-updating lineage views
- richer causality lenses backed by real per-commit evidence graphs
- multi-provider provenance comparison after Codex-first stabilization
