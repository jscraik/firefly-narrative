---
status: pending
priority: p1
issue_id: CR-010
tags:
  - code-review
  - security
  - architecture
  - mcp
  - tauri
dependencies: []
---

## Problem Statement
The universal agent tracking plan defines critical MCP security controls, but the implementation surface for those controls is still absent. This leaves a documented high-risk area unresolved.

## Findings
- The plan explicitly requires `src-tauri/src/adapters/mcp_client.rs` with OAuth Resource Indicators (RFC 8707) and authenticated MCP server transport.
- The same plan includes unchecked critical checklist items for “MCP Client: Implements RFC 8707” and “MCP Server: Requires authentication for HTTP transport.”
- No corresponding MCP adapter/server files currently exist under `src-tauri/src/`, so these controls cannot be enforced at runtime.

### Evidence
- `/Users/jamiecraik/dev/firefly-narrative/docs/plans/2026-02-17-feat-universal-agent-tracking-plan.md` (lines ~492, 532, 651, 1003-1004)
- File search: no `mcp_client.rs` / `mcp_server.rs` in `/Users/jamiecraik/dev/firefly-narrative/src-tauri/src`

## Proposed Solutions
### Option 1 (Recommended): Implement MCP client/server modules with mandatory auth gates
- **Effort:** Large
- **Risk:** Medium
- **Pros:** Closes the highest-risk documented gap with explicit transport/auth enforcement.
- **Approach:** Add `mcp_client.rs` and `mcp_server.rs`; enforce RFC 8707 resource indicators and authenticated HTTP transport before accepting session data.

### Option 2: Feature-gate MCP ingestion until controls exist
- **Effort:** Small
- **Risk:** Low
- **Pros:** Prevents insecure partial rollout.
- **Approach:** Hard-disable MCP ingestion paths via config/feature flag; document temporary limitation.

### Option 3: Stub modules + failing tests first
- **Effort:** Medium
- **Risk:** Low
- **Pros:** Creates a safe RED baseline and prevents silent omission.
- **Approach:** Add modules with TODO guards and tests that fail unless auth/resource-indicator paths are implemented.

## Recommended Action

## Technical Details
- Affected components: planned MCP adapter/server surface for universal tracking.
- Risk category: authn/authz + token misuse prevention.

## Acceptance Criteria
- [ ] `mcp_client` implements RFC 8707 resource-indicator flow.
- [ ] MCP server transport rejects unauthenticated HTTP ingestion.
- [ ] Security tests validate rejection paths and token scoping.
- [ ] Plan checklist items for MCP security can be marked complete with evidence.

## Work Log
- 2026-02-24: Review identified missing MCP security implementation surface versus plan requirements.

## Resources
- `/Users/jamiecraik/dev/firefly-narrative/docs/plans/2026-02-17-feat-universal-agent-tracking-plan.md`
