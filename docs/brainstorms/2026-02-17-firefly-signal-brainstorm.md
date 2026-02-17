# Firefly Signal System — Brainstorm

> Date: 2026-02-17  
> Status: Ready for planning  
> Related: Narrative desktop app (Tauri + React + Tailwind v4)

---

## What We're Building

An **ambient UI instrument** — a persistent "signal cursor" that lives in the commit graph overlay, conveying system state without demanding attention. Think of it as a status LED on professional equipment: always visible, meaningful when it matters, ignorable when it doesn't.

### Core Primitives

1. **Core Node** — small glowing orb (8–12px), always anchored to the active commit
2. **Pulse Ring** — event-driven ring that appears on state changes
3. **Trail** — temporary path highlight connecting relevant commits
4. **Thread Highlight** — sequential edge illumination (like signal propagation through a graph)

---

## Why This Approach

**Context:** Narrative is a dev tool + analytics platform with timeline/commit visualization, dashboard insights, and AI-session linking. The firefly needs to feel *technical* and *purposeful*, not decorative.

**Key Principles:**
- **Default state must be nearly ignorable** — tiny footprint, low luminance, minimal motion
- **Motion only when it conveys meaning** — signal tracing, not "magic dust"
- **Structured propagation over sparkles** — BFS-style edge illumination reads as "signal tracing through a graph"

**Placement Strategy:**
- **Primary:** Graph overlay — firefly acts as focus indicator on the active commit node
- **Secondary (optional):** Top-bar status dot for "analysis state" (idle/processing/insight)

---

## Key Decisions

### 1. State Machine

| State | Visual Behavior | Meaning |
|-------|-----------------|---------|
| **Idle** | Faint glow breathing (6–10s cycle), no travel | System on, nothing notable |
| **Tracking** | Glides to selected commit, no trail | Focus changed |
| **Analyzing** | Glow tightens, subtle micro-pulse | Compute happening |
| **Insight Found** | One clean pulse ring → thread illumination | "Here's the pattern" |
| **Anomaly** | Sharper pulse, surrounding graph dims 300–600ms | "This is the odd bit" |
| **Offline** | Dim neutral dot, no motion | Analysis engine not ready |

### 2. Visual Spec ("Don't Annoy People" Defaults)

- Core diameter: **8–12px**
- Idle opacity: **0.35–0.55**
- Idle breathe cycle: **6–10s** (slow)
- Pulse ring duration: **250–450ms**
- Thread highlight: **900–1600ms** then fade
- Core should never be brightest thing on screen unless event fires
- Reserve high-saturation intensity for events only

### 3. Animation Discipline

- Use only `transform`, `opacity`, `filter` (sparingly)
- `pointer-events: none` — never blocks interactions
- Respect `prefers-reduced-motion`
- CSS variables + data attributes for state changes: `data-state="idle|tracking|insight|anomaly"`

### 4. User Control

Even subtle ornaments can annoy. Include:
- Settings toggle: **Show Signal** (default: on)
- Optional: **Reduce glow intensity**

### 5. Brand Split

- **In-product (always-on):** Abstract signal version (technical authority)
- **External (README, landing):** Illustrated firefly character (brand warmth)

---

## Open Questions (for planning phase)

1. **Trigger Events** — What exactly fires "insight found" vs "anomaly"?
   - Dashboard analysis complete?
   - Trace correlation detected?
   - Manual user action?

2. **Node Positioning** — How does firefly get coordinates?
   - Does `BranchView` expose a ref/method to query node positions?
   - Track via scroll + DOM queries?
   - Compute from graph layout data?

3. **Settings Persistence** — Save to Tauri config or localStorage?

4. **Insight Data Flow** — Which component provides the "insight found" events? Dashboard? Trace analyzer?

---

## Implementation Phases (Proposed)

1. **Passive Indicator** — Core dot anchored to selected commit, idle breathe
2. **Insight Pulse** — Pulse ring on insight events (dashboard findings, timeline patterns, session-to-commit linkage)
3. **Thread Illumination** — Edge traversal highlight + short fade

Each step delivers value and tests whether it feels distracting.

---

## Stack Context

- **Tauri v2** (Rust backend)
- **React 18+** + **TypeScript**
- **Vite** + **Tailwind v4**
- **Target:** Render as portal overlay in `App.tsx`, feed from `BranchView` node positions

---

## Related Files

- `src/App.tsx` — Add `<FireflySignal/>` portal here
- `src/ui/views/BranchView.tsx` — Source of node coordinates
- `src/core/types.ts` — Event types for insight/anomaly triggers
