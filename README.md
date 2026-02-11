<p align="center">
  <img src=".agent/ui-final-1-demo.png" width="700" alt="Narrative Desktop - Version control as a narrative medium">
</p>

<h1 align="center">Narrative</h1>

<p align="center">
  <strong>Version control as a narrative medium</strong><br>
  Capture the story behind your code — from AI prompts to commits
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="docs/README.md">Docs</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## The Problem

When you code with AI (Claude Code, Codex, Cursor), the rich context — your intent, the conversation, dead ends, reasoning — disappears into the void. Your git commit only shows *what* changed, not *why*.

**Narrative captures the full story:** AI sessions → intent → commits → timeline.

<p align="center">
  <img src=".agent/ui-final-2-repo.png" width="600" alt="Repository timeline view">
</p>

---

## Features

- **📖 Timeline View** — Navigate commits with context, not just diffs
- **🤖 AI Session Import** — Import Claude Code, Codex CLI, Cursor sessions
- **🔗 Session-to-Commit Linking** — See which AI conversations led to which commits
- **📊 Dashboard** — Insights into your AI-assisted workflow
- **🔍 Atlas Search** — Full-text search across all sessions and commits
- **💾 Local-First** — All data stays on your machine (`.narrative/` folder)

---

## Quick Start

### Download

Grab the latest release for macOS, Linux, or Windows from the [Releases page](../../releases).

### Build from Source

**Prerequisites:** Node.js + pnpm, Rust toolchain, git

```bash
pnpm install
pnpm tauri dev
```

Then open a git repository and see your commit history with narrative context.

---

## Documentation

- [`docs/README.md`](docs/README.md) — Documentation index
- [`docs/agents/development.md`](docs/agents/development.md) — Development setup
- [`docs/agents/testing.md`](docs/agents/testing.md) — Testing commands
- [`docs/agents/repo-structure.md`](docs/agents/repo-structure.md) — Codebase layout

---

## Contributing

We'd love your help! Narrative is built with **Tauri v2** (Rust backend + React frontend).

### Quick Setup

```bash
pnpm install
pnpm tauri dev
```

### Ways to Contribute

- **🐛 Bug Reports** — [Open an issue](../../issues/new?template=bug_report.yml)
- **💡 Feature Requests** — [Request a feature](../../issues/new?template=feature_request.yml)
- **🔧 Code** — Look for [good first issues](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- **📖 Documentation** — Help improve our docs
- **🧪 Testing** — Try it out and report your experience

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS v4 + Vite
- **Backend:** Rust (Tauri v2) + sqlx + git2
- **Database:** SQLite (tauri-plugin-sql)
- **Build:** Cargo (Rust) + pnpm (Node)

---

## What Gets Written to Your Repo

When you open a repo, Narrative creates a `.narrative/` folder:

```
.narrative/
├── meta/
│   ├── repo.json
│   ├── branches/<branch>.json
│   └── commits/<sha>.json
└── sessions/
    └── imported/*.json
```

These files are **committable** — share the narrative layer with your team.

---

## Roadmap

- [x] Session import and viewing
- [x] Commit timeline with file changes
- [x] Session-to-commit linking
- [x] Atlas search (full-text session search)
- [ ] Auto-import from Claude Code / Codex CLI logs
- [ ] Git notes integration for team sync
- [ ] Multi-level narrative (commits → sessions → milestones)
- [ ] "Speculate" mode — predict file changes from history

---

<p align="center">
  Built with ❤️ by <strong>brAInwav</strong>
</p>
