# Universal Agent Tracking Brainstorm

**Date:** 2026-02-17  
**Topic:** Tracking sessions from all AI agents (Kimi, Amp, OpenCode, Claude, Copilot, Codex) and IDEs in Narrative  
**Status:** Exploratory — scope expanded from Codex-only to universal  

---

## What We're Building

A **universal agent tracking layer** that captures the "why" behind code changes regardless of which AI tool or IDE the developer used. The commit remains the anchor, but the conversation—the prompts, responses, tool calls, and reasoning—is captured from every source.

### Core Thesis (from Narrative Manifesto)

> "Code used to be for engineers. Now it is for everyone who can prompt. The artefacts need to reflect that."

### Agents to Support

| Agent/Tool | Platform | Data Source | Status |
|------------|----------|-------------|--------|
| **Kimi** | CLI, IDE plugins | Log files, API | Planned |
| **Amp** | CLI | Log files | Planned |
| **OpenCode** | CLI | JSON-RPC, logs | Planned |
| **Claude Code** | CLI | `.claude/projects` | ✅ Existing |
| **Claude Desktop** | Desktop app | MCP, API | Planned |
| **GitHub Copilot** | VS Code, JetBrains | Extension API, logs | Planned |
| **Codex CLI** | CLI | OTLP, App Server | ✅ Existing |
| **Codex App Server** | Sidecar | JSON-RPC | Planned |
| **Cursor** | IDE | Extension API, logs | Planned |
| **Windsurf** | IDE | Extension API, logs | Planned |

---

## Architecture Pivot

### Old Approach (Codex-Only)
Codex App Server as primary source — too narrow for multi-agent support.

### New Approach (Universal)
**Adapter pattern** with normalized internal schema:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Agent Adapters                                │
├──────────────────────────────────────────────────────────────────────┤
│  Codex Adapter    Kimi Adapter    Amp Adapter    Claude Adapter     │
│  ├── OTLP         ├── Log Parser  ├── Log Parser ├── .claude/       │
│  ├── App Server   └── API         └── API        │   projects       │
│  └── JSON-RPC                                    └── MCP             │
├──────────────────────────────────────────────────────────────────────┤
│                    Normalized Session Schema                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Session {                                                  │    │
│  │    id: string (deterministic)                               │    │
│  │    tool: "kimi" | "claude_code" | "codex" | "copilot"...    │    │
│  │    model: string                                            │    │
│  │    startTime: DateTime                                      │    │
│  │    durationMs: number                                       │    │
│  │    messages: Message[]                                      │    │
│  │    filesTouched: string[]                                   │    │
│  │    toolCalls: ToolCall[]                                    │    │
│  │    diff?: string                                            │    │
│  │    rawSource: unknown (preserve original)                   │    │
│  │  }                                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────┤
│                      Session Store (SQLite)                          │
│  ├── sessions table                                                  │
│  ├── session_links table (commit association)                        │
│  ├── tool_calls table                                                │
│  └── agent_metadata table (per-tool extensions)                      │
├──────────────────────────────────────────────────────────────────────┤
│                        Git Notes Writer                              │
│  └── refs/notes/narrative (unified, not tool-specific)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Capabilities

### 1. Real-Time Session Streaming

**For supported agents:**
- **Codex App Server**: JSON-RPC events → immediate UI updates
- **Claude MCP**: Model Context Protocol events → immediate UI updates
- **IDE extensions**: WebSocket or stdio → immediate UI updates

**For file-based agents:**
- **Kimi, Amp, Claude Code**: File watchers → near-real-time (seconds delay)
- Poll on interval or use OS-specific file change events

### 2. Git Notes Writeback

**Unified format** (not tool-specific):

```json
{
  "schema_version": "1.0",
  "session_id": "sha256:kimi:abc123",
  "tool": "kimi",
  "model": "kimi-k2.5",
  "summary": "Refactored auth middleware",
  "intent": "Simplify JWT validation logic",
  "prompts": 5,
  "files": ["src/auth.ts", "src/middleware/jwt.ts"],
  "excerpts": [
    { "role": "user", "text": "Refactor auth to use middleware pattern" },
    { "role": "assistant", "text": "I'll refactor the auth logic..." }
  ],
  "linked_at": "2026-02-17T01:43:00Z"
}
```

**Benefits:**
- Single format across all tools
- Readable via `git log --notes=narrative`
- Survives repo clones and forks

### 3. Cross-Tool Session Replay

**Unified replay UI:**
- Load session from any tool → render in consistent timeline format
- Show tool-specific metadata (model, temperature, tool calls) when relevant
- Cross-tool comparison: "How did Claude vs Kimi approach this problem?"

**Cloud replay where available:**
- Codex: via App Server `thread/get`
- Claude: via Anthropic API (if available)
- Kimi: via Kimi API (if available)
- Others: local storage only

---

## Key Decisions

### Decision 1: Adapter Pattern over Universal Protocol

**Rejected:** Mandate all agents use single protocol (impossible — vendors won't comply)  
**Selected:** Per-agent adapters with normalized internal schema

**Rationale:**
- Each agent has different data sources (files, APIs, protocols)
- Normalized schema allows unified UI and cross-tool features
- New agents can be added without changing core architecture

### Decision 2: File-Watching for Most, Real-Time for Some

**Real-time streaming:** Codex (App Server), Claude (MCP), IDE extensions  
**File-based polling:** Kimi, Amp, Claude Code, other CLIs

**Rationale:**
- Most agents don't expose streaming protocols
- File watching is "good enough" for most use cases
- Real-time is a nice-to-have, not a requirement

### Decision 3: Unified Git Notes Format

**Rejected:** `refs/notes/codex`, `refs/notes/kimi`, etc.  
**Selected:** Single `refs/notes/narrative` with tool metadata

**Rationale:**
- Simpler git operations
- Cross-tool view in `git log`
- No namespace pollution

---

## Open Questions

### Technical

1. **IDE integration scope**: VS Code extension only, or JetBrains too?
   - *Impact:* VS Code has richer extension API; JetBrains requires platform-specific work

2. **MCP support**: Should Narrative act as an MCP client, server, or both?
   - *Option A:* Client — connects to Claude Desktop MCP
   - *Option B:* Server — agents connect to Narrative
   - *Option C:* Both — maximum flexibility

3. **Session identity**: How to deduplicate if same session is captured from multiple sources?
   - *Example:* Codex CLI via OTLP + Codex App Server via JSON-RPC
   - *Mitigation:* Hash of (tool + start time + file fingerprint)

4. **Copilot integration**: Official API vs extension-sidecar hack?
   - *Official API:* Limited access, rate limits
   - *Extension hack:* Unstable, may break

5. **Cloud replay scope**: Which tools support fetching historical sessions?
   - Known: Codex (App Server)
   - Unknown: Kimi, Claude, others

### Product

6. **Cross-tool diff**: Should Narrative show "Claude vs Kimi" comparison views?
   - *Manifesto alignment:* "Narrative foresight" could include exploring alternative paths

7. **Tool preferences**: Should Narrative recommend tools based on past sessions?
   - *Risk:* Vendor bias, user trust

8. **Privacy model**: Some tools (Copilot) send code to cloud; how to communicate this?
   - *Need:* Clear indicators of what leaves the machine

---

## Architecture Sketch

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Narrative (Tauri)                           │
├─────────────────────────────────────────────────────────────────────┤
│  React UI                                                           │
│  ├── Timeline: mixed-tool session badges                           │
│  ├── SessionPanel: unified message rendering                        │
│  ├── ToolBadge: indicates agent (Kimi, Claude, etc.)               │
│  ├── ComparisonView: side-by-side tool outputs (v2)                │
│  └── ApprovalModal: for agents that support gating                 │
├─────────────────────────────────────────────────────────────────────┤
│  Rust Backend                                                       │
│  ├── AdapterManager: routes to correct adapter                      │
│  │   ├── CodexAdapter (OTLP + App Server)                          │
│  │   ├── KimiAdapter (File watcher + API)                          │
│  │   ├── ClaudeAdapter (.claude/ + MCP)                            │
│  │   ├── CopilotAdapter (Extension API)                            │
│  │   └── OpenCodeAdapter (JSON-RPC)                                │
│  ├── SessionNormalizer: tool schema → unified schema               │
│  ├── FileWatcher: detects new session files                        │
│  ├── GitNotesWriter: unified format                                │
│  └── SessionStore: SQLite                                          │
├─────────────────────────────────────────────────────────────────────┤
│  External Agents                                                    │
│  ├── Codex CLI (OTLP)                                               │
│  ├── Codex App Server (JSON-RPC)                                    │
│  ├── Kimi CLI (log files)                                           │
│  ├── Claude Code (file-based)                                       │
│  ├── Claude Desktop (MCP)                                           │
│  └── IDE Extensions (VS Code, JetBrains)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

1. **Multi-tool**: Capture sessions from at least 3 different agents (Claude, Kimi, Codex)
2. **Unified view**: Single timeline shows mixed-tool sessions with clear badges
3. **Git notes**: All captured sessions write to `refs/notes/narrative`
4. **Linking accuracy**: >80% auto-link success (confidence ≥ 0.7)
5. **Replay**: Can view full session history for supported tools

---

## Migration from Codex-Only

Current state: OTLP receiver + `.claude/projects` parser

Migration steps:
1. Rename `otlp_receiver.rs` → `adapters/codex_otlp.rs`
2. Move `.claude/` parser → `adapters/claude_file.rs`
3. Create `AdapterManager` to route between adapters
4. Add `SessionNormalizer` for unified schema
5. Update git notes from `refs/notes/codex` → `refs/notes/narrative`
6. Add new adapters incrementally (Kimi, Amp, etc.)

---

## Decisions Locked (2026-02-17)

| Question | Decision |
|----------|----------|
| **1. Priority agents** | Claude + Kimi + Codex first (3 agents) |
| **2. IDE scope** | VS Code / Cursor only (not JetBrains) |
| **3. MCP role** | **Both** — Narrative acts as MCP client (connects to Claude Desktop) AND server (agents push to Narrative) |
| **4. Copilot integration** | **Option B** — VS Code Extension (unofficial but rich data) |

---

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. Refactor existing OTLP receiver → `adapters/codex_otlp.rs`
2. Refactor existing `.claude/` parser → `adapters/claude_file.rs`
3. Create `AdapterManager` + `SessionNormalizer` + unified schema
4. Update git notes to `refs/notes/narrative`

### Phase 2: New Agents (Week 3-4)
1. Build `adapters/kimi.rs` (file watcher + API)
2. Build `adapters/codex_app_server.rs` (JSON-RPC)
3. Build `adapters/claude_mcp.rs` (MCP client mode)

### Phase 3: IDE + Copilot (Week 5-6)
1. VS Code/Cursor extension scaffold
2. Copilot capture via extension API
3. MCP server mode (agents push to Narrative)

---

## Next Steps

Ready for `/prompts:workflows-plan` — all blockers resolved.

**Recommended immediate action:** Start Phase 1 — refactor existing parsers into adapter pattern.

---

*Document generated: 2026-02-17*  
*Scope expanded: Codex-only → Universal agent tracking*  
*Decisions locked: 2026-02-17*
