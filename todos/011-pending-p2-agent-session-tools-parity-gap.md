---
status: pending
priority: p2
issue_id: CR-011
tags:
  - code-review
  - architecture
  - agent-native
  - tauri
dependencies: []
---

## Problem Statement
The plan specifies agent session-management tools, but those tools are not present in the codebase. This creates an agent/UI capability parity gap.

## Findings
- The plan defines `agent_list_sessions`, `agent_get_session`, and `agent_link_session_to_commit` under a new `src-tauri/src/agent_tools/session_tools.rs`.
- Those APIs are not implemented in the current `src-tauri/src` tree.
- Without these tools, agents cannot access the same live-session management primitives expected by the plan.

### Evidence
- `/Users/jamiecraik/dev/firefly-narrative/docs/plans/2026-02-17-feat-universal-agent-tracking-plan.md` (lines ~374, 377, 385, 393, 777, 799)
- File search: no `session_tools.rs` or `agent_tools/` module under `/Users/jamiecraik/dev/firefly-narrative/src-tauri/src`

## Proposed Solutions
### Option 1 (Recommended): Implement session tools exactly as planned
- **Effort:** Medium
- **Risk:** Medium
- **Pros:** Restores planned agent-native parity and enables automation workflows.
- **Approach:** Add `agent_tools/session_tools.rs`, wire commands to existing session tables, and expose through Tauri command surface.

### Option 2: Narrow the plan to current capabilities
- **Effort:** Small
- **Risk:** Medium
- **Pros:** Reduces immediate implementation burden.
- **Approach:** Update docs to explicitly defer these tools and define temporary alternatives.

### Option 3: Implement read-only subset first
- **Effort:** Small
- **Risk:** Low
- **Pros:** Delivers immediate parity improvement with lower risk.
- **Approach:** Ship `agent_list_sessions` + `agent_get_session` first, then link/write paths.

## Recommended Action

## Technical Details
- Affected area: planned agent API surface for session discovery/linking.
- Impact: reduced automation and weaker agent-native feature parity.

## Acceptance Criteria
- [ ] `agent_list_sessions` and `agent_get_session` are implemented and tested.
- [ ] `agent_link_session_to_commit` is implemented with validation.
- [ ] Agent docs reference live, working command names.

## Work Log
- 2026-02-24: Documented agent-session tooling gap between plan and implementation.

## Resources
- `/Users/jamiecraik/dev/firefly-narrative/docs/plans/2026-02-17-feat-universal-agent-tracking-plan.md`
