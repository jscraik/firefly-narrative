# Atlas Spec (Narrative Native Session Search)

**Version:** 0.1.0 (draft)

**Status:** internal RFC

**Purpose:** Atlas is the **local-first indexing + search subsystem** inside Narrative that makes agent sessions globally searchable and attachable to repo narrative (commits/branches/highlights) without external tools.

> This RFC describes both:
>
> - **What is shipped in v0.1** (implemented as of Feb 2026), and
> - **What is planned** (clearly labeled “Future”).

**Implementation alignment (Narrative as of Feb 2026):**

- Atlas ships **inside** the existing Narrative desktop app.
- Atlas storage is **local-only** and lives in the existing global SQLite database (Narrative’s `narrative.db` in App Support), not a second `~/.narrative/atlas/db.sqlite` database.
- Atlas lexical search uses **SQLite FTS5** as the rebuildable derived index.
- Chunk references that can be attached to commits/branches/highlights use a **deterministic chunk identifier** (`chunk_uid`) to remain stable across rebuilds.
- v0.1 is **repo-scoped by default**: all Atlas storage and queries are keyed by `repo_id` (matching Narrative’s “one repo context loaded at a time” UI model).

---

## 1) Goals

1. **Native install**: ships inside Narrative (no external binaries).
2. **Search-as-you-type**: prefix-optimized lexical search.
3. **Optional offline semantic + hybrid**: local embeddings + hybrid fusion for recall.
4. **Agent-ready retrieval**: stable “robot JSON” endpoints with strict budgets and structured errors.
5. **Rebuildable derived state**: Doctor can rebuild indexes without touching raw/canonical transcripts.

---

## 2) Non-goals

- Remote source sync (SSH/rsync), distributed indexing.
- A separate TUI (Narrative UI is the interface).
- Cloud embeddings / server dependency.

---

## 3) Core concepts (terminology)

- **Session**: a single agent work transcript (tool-specific origin).
- **Chunk**: a normalized, bounded text unit from a session (`prompt|assistant|tool|summary|error`).
- **Connector**: discovers + parses sessions from a source (Claude Code, Codex, etc).
- **Canonical transcript**: the authoritative stored transcript payload (Narrative `sessions.raw_json`).
- **Atlas ground truth**: the SQLite rows that represent Atlas’s canonical search inputs (sanitized chunks + metadata).
- **Derived index**: rebuildable search structures (FTS lexical index; optional vector index).
- **Hit**: a chunk-level search match returned to UI/agents.

---

## 4) Storage model (boundaries)

### 4.1 Global (local-only) store

Atlas is implemented as additional tables + indexes in Narrative’s existing global SQLite DB:

- **Global DB:** Narrative `narrative.db` (App Support)
  - contains canonical Narrative tables (repos/commits/sessions/trace/links/etc)
  - contains Atlas tables (`atlas_*`) + derived indexes

> Note: This choice intentionally avoids a second global DB at `~/.narrative/atlas/db.sqlite` to reduce duplication and “split brain” query paths.

### 4.2 Derived indexes

- **Lexical index (v0.1):** SQLite **FTS5** virtual table built from `atlas_chunks.text`.
  - Rebuildable via `atlas.doctor_rebuild_derived`.
  - Prefix/typeahead via FTS5 prefix support.
- **Vector index (Future):** implementation-defined (optional), Doctor-managed.

### 4.3 Repo narrative store (committable vs local)

- Atlas results can be **attached** to repo narrative as references.
- Atlas does not decide what is committable; Narrative enforces repo policy.
- Recommended portability mechanism: **Story Anchors (Git Notes)** for commit-scoped narrative objects.

---

## 5) SQLite schema (Atlas ground truth)

> **Important:** v0.1 intentionally reuses Narrative’s `sessions` as the canonical transcript store.
> Atlas persists only **derived** (rebuildable) text chunks and per-repo index state.

### 5.1 Tables (v0.1 shipped)

#### `atlas_chunks` (derived projection)

Projected, normalized text chunks derived from Narrative `sessions.raw_json`.

Columns:

- `id INTEGER PRIMARY KEY`
- `chunk_uid TEXT NOT NULL UNIQUE`
- `repo_id INTEGER NOT NULL` (FK `repos.id`)
- `session_id TEXT NOT NULL` (FK `sessions.id`)
- `chunk_index INTEGER NOT NULL` (0..N; deterministic)
- `start_message_index INTEGER NOT NULL`
- `end_message_index INTEGER NOT NULL`
- `role_mask TEXT NOT NULL` (comma-separated roles included, e.g. `assistant,user,tool_call`)
- `text TEXT NOT NULL` (sanitized / bounded)
- `session_imported_at TEXT NULL` (copied from `sessions.imported_at` for sort/filter)
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

Uniqueness:

- `UNIQUE(repo_id, session_id, chunk_index)` (supports delete-and-replace rebuilds per session)

Deterministic `chunk_uid` construction (v0.1 shipped):

- `chunk_uid` is derived from:
  - `derived_version` (e.g. `atlas/0.1.0`)
  - `repo_id`
  - `session_id`
  - `chunk_index`
  - `start_message_index..end_message_index`
  - `sha256(text)`
  - then hashed and shortened to `atl_<24 hex chars>`

> Attachments should use `chunk_uid` rather than `chunk_id` to remain stable across re-chunking/rebuilds.

#### `atlas_index_state` (per-repo derived state)

Tracks derived index version + rebuild status **per repo**.

- `repo_id INTEGER PRIMARY KEY` (FK `repos.id`)
- `derived_version TEXT NOT NULL` (e.g. `atlas/0.1.0`)
- `last_rebuild_at TEXT NULL`
- `last_updated_at TEXT NULL`
- `last_error TEXT NULL`
- `sessions_indexed INTEGER NOT NULL DEFAULT 0`
- `chunks_indexed INTEGER NOT NULL DEFAULT 0`
- `created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`

### 5.2 Derived lexical index (FTS5)

Implement lexical search as an FTS5 virtual table sourced from `atlas_chunks`.

- v0.1 table: `atlas_chunks_fts(text)` with:
  - `content='atlas_chunks'` and `content_rowid='id'`
  - `prefix='2 3 4'` for typeahead/prefix search
  - triggers to keep FTS in sync on insert/update/delete

Doctor can rebuild by:

1. Re-projecting `atlas_chunks` from `sessions.raw_json` (derived state)
2. Asking FTS to rebuild from content table: `INSERT INTO atlas_chunks_fts(atlas_chunks_fts) VALUES('rebuild')`

### 5.3 Future schema (not shipped in v0.1)

- `atlas_sessions` physical table (optional) for richer metadata and dedupe.
- `atlas_embeddings` / vector index.

---

## 6) Indexing pipeline

v0.1 pipeline (shipped):

1. Sessions are imported into Narrative’s `sessions` table (canonical transcript in `sessions.raw_json`).
2. Atlas derives `atlas_chunks` from `sessions.raw_json`:
   - best-effort during import (`store_session_*`)
   - and/or via `atlas.doctor_rebuild_derived` (full rebuild)
3. Derived FTS index stays consistent via triggers; doctor rebuild calls `FTS rebuild` for determinism.

**Narrative integration point:** this pipeline should run adjacent to the existing Rust session import path so it shares the same redaction and provenance rules.

---

## 7) Search backends & modes

Atlas supports multiple modes behind one API.

### 7.1 Typeahead (prefix-optimized lexical)

- Fast results suitable for “search-as-you-type”.
- Implemented via FTS5 prefix indexing.

### 7.2 Lexical (keyword)

- BM25-style scoring over chunk bodies (FTS5 `bm25()` ranking).
- Filters via metadata: tool/model/workspace/machine/kind/time + repo filters.

### 7.3 Semantic (Future)

- Query embedding → top-K retrieval over stored chunk embeddings.
- Offline model; no network required after install.

### 7.4 Hybrid (Future)

- Run lexical + semantic and fuse with **RRF (Reciprocal Rank Fusion)**.
- De-dup by `chunk_uid`; optionally collapse to best-hit-per-session.

---

## 8) Public “robot” API contract (v0.1 shipped)

Atlas is callable via:

- Narrative UI (Tauri commands)
- Narrative CLI (optional but recommended)
- MCP tool wrapper (optional)

### 8.0 Response envelope (v0.1)

All Atlas commands return a simple, typed envelope:

```json
{ "ok": true, "value": { /* payload */ }, "meta": { "truncated": true } }
```

or

```json
{ "ok": false, "error": { "code": "INVALID_QUERY", "message": "Invalid query" } }
```

Notes:

- `meta.truncated` is included only when Atlas deterministically truncated output to meet hard budgets.
- v0.1 does **not** include `schema_version`, `generated_at`, `warnings[]`, or `errors[]` arrays. (See “Future”.)

### 8.1 Endpoints

The current shipped Tauri commands are:

- `atlas.capabilities`
  - returns derived version + hard budgets + FTS availability flags
- `atlas.introspect(repoId)`
  - returns per-repo `atlas_index_state` plus table counts
- `atlas.search({ repoId, query, limit? })`
  - returns ranked chunk hits (FTS5 `bm25()` + snippet)
  - deterministic ordering
  - no pagination in v0.1
- `atlas.get_session({ repoId, sessionId, maxChunks? })`
  - returns bounded session metadata + top derived chunks
- `atlas.doctor_report(repoId)`
  - integrity report + freshness status (`ok|stale|missing_fts`)
- `atlas.doctor_rebuild_derived({ repoId })`
  - clears and rebuilds derived chunks; then requests an FTS rebuild

> Future endpoints (`atlas.index_incremental`, semantic/hybrid modes, filters, pagination) are not shipped in v0.1.

### 8.2 Budgets (hard requirement)

Budgets are enforced server-side (Rust) and exposed via `atlas.capabilities`.

Key v0.1 budgets (non-exhaustive):

- `queryMaxChars` (query length)
- `queryMaxTerms` (split on whitespace)
- `limitMax` (top-K bound)
- `snippetMaxChars` (hit snippet cap)
- `chunkTextMaxChars` (max chars per chunk and per chunk assembly)
- `getSessionMaxChunks` (max chunks to return for a session)
- `responseMaxChars` (hard cap for the whole response; excess is dropped deterministically)

### 8.3 Error envelope (standard)

```json
{
  "ok": false,
  "error": {
    "code": "FTS_NOT_AVAILABLE",
    "message": "FTS index not available in this database build"
  }
}
```

### 8.4 Error codes (v0.1)

v0.1 error codes are returned as `SCREAMING_SNAKE_CASE` strings:

- `BUDGET_QUERY_TOO_LONG`
- `BUDGET_TOO_MANY_TERMS`
- `BUDGET_LIMIT_TOO_HIGH`
- `BUDGET_SESSION_ID_TOO_LONG`
- `BUDGET_MAX_CHUNKS_TOO_HIGH`
- `BUDGET_RESPONSE_TOO_LARGE` (reserved; may be used as budget enforcement evolves)
- `REPO_NOT_FOUND`
- `SESSION_NOT_FOUND`
- `FTS_NOT_AVAILABLE`
- `INVALID_QUERY`
- `INTERNAL`

---

## 9) Doctor (integrity + rebuild)

### 9.1 Doctor report checks

- SQLite reachable + schema ok
- derived FTS index present
- session/chunk counts match expectations for the current repo
- index freshness: compare indexable sessions vs sessions with derived chunks

### 9.2 Doctor actions

- rebuild derived chunks projection (from canonical sessions)
- request an FTS rebuild
- never mutates canonical transcripts; only derived state

---

## 10) Integration points with Narrative

Atlas provides:

- global session discovery and retrieval
- stable IDs (`session_id`, `chunk_uid`) for attaching to:
  - commit narrative
  - branch timeline milestones
  - manual highlights
- export-friendly JSON payloads for agents/tools

Narrative owns:

- “attach/import into repo” semantics
- committable vs local-only policy
- UI/UX for progressive disclosure

---

## 11) Versioning

- v0.1 uses `derived_version` (e.g. `atlas/0.1.0`) stored in `atlas_index_state`.
- SQLite migrations evolve the derived schema (e.g. `012_atlas.sql` introduces `atlas_chunks` + FTS).
- Future: formal API `schema_version` (e.g. `atlas.v1`) + additive evolution rules.

---

## Appendix A: Risk and Mitigation Checklist (Option B: Atlas-in-narrative.db)

### A) Data integrity and duplication

- **Risk:** Atlas duplicates data and diverges from canonical sessions.
- **Mitigation:** Treat Narrative `sessions.raw_json` as canonical transcript; Atlas persists only derived, rebuildable chunks. Use deterministic `chunk_uid` + delete-and-replace projection and track counts in `atlas_index_state` for drift checks.

Must-have: deterministic chunk IDs + rebuild path + index_state.

### B) Privacy and redaction

- **Risk:** Sensitive content leaks into Atlas chunks or embeddings.
- **Mitigation:** Redact before chunk persistence and embedding; budgets enforced in Rust commands; never return raw transcripts by default.

Must-have: redaction before chunking and embedding.

### C) Performance and storage growth

- **Risk:** Chunking + FTS + embeddings increase DB size and slow queries.
- **Mitigation:** hard caps (max chars, max chunks per session), keep derived rebuild explicit, and track counts in `atlas_index_state`.

Must-have: caps + index_state.

### D) SQLite contention

- **Risk:** Rust pool + JS plugin + Atlas writes cause locking.
- **Mitigation:** batch writes, keep transactions short, do rebuilds in background with clear UI status.

Must-have: short batch writes + background rebuild.

### E) Index drift or missing indexes

- **Risk:** Search uses stale or missing indexes.
- **Mitigation:** Doctor report + rebuild; robot endpoints return `FTS_NOT_AVAILABLE` when FTS is absent.

Must-have: doctor report + rebuild action.

### F) Budget overrun in robot API

- **Risk:** Agent calls return too much data or run too long.
- **Mitigation:** enforce budgets in Rust with deterministic truncation (`meta.truncated: true`), stable ordering, and hard caps.

Must-have: budget enforcement in Rust.

### G) Semantics quality (optional)

- **Risk:** Embedding model mismatch or weak recall.
- **Mitigation:** capability-gate semantic/hybrid; report model + dims in `atlas.capabilities`.

Must-have: capabilities include model + dims.

### H) UX confusion (global vs repo scope)

- **Risk:** Results appear detached from repo narrative.
- **Mitigation:** repo-scoped search by default (`repoId` required) and label hits with tool/model/import time.

Must-have: repo-scoped search and clear hit labeling.
