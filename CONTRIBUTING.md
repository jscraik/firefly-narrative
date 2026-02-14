# Contributing to Narrative

Thank you for your interest in contributing! Narrative is a desktop app built with **Tauri v2** (Rust backend + React frontend) that helps developers capture the story behind their code.

## Quick Start

### Prerequisites

- Node.js (18+) + pnpm
- Rust toolchain (latest stable)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/jscraik/narrative.git
cd narrative

# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev
```

## Development Workflow

### Project Structure

```
narrative/
├── src/                    # React frontend
│   ├── ui/                # UI components
│   ├── core/              # Business logic
│   └── lib/               # Utilities
├── src-tauri/src/         # Rust backend
│   ├── import/            # Session parsers
│   ├── story_anchors/     # Git notes integration
│   └── ...
└── docs/                  # Documentation
```

### Running Tests

```bash
# TypeScript type check
pnpm typecheck

# Lint (Biome)
pnpm lint

# Rust checks
cd src-tauri && cargo check && cargo clippy
```

### Making Changes

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Make your changes** with clear, focused commits
3. **Test**: Run the test commands above
4. **Document**: Update relevant docs if needed
5. **Submit**: Open a PR with a clear description

## What to Contribute

### Good First Issues

Look for issues labeled [`good first issue`](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22). These are specifically chosen for new contributors.

### Areas We Need Help

- **Parser Support**: Adding support for new AI tools (session log parsers)
- **UI/UX**: Accessibility, responsive design, visual polish
- **Documentation**: Tutorials, guides, API docs
- **Testing**: Unit tests, integration tests, manual QA
- **Bug Fixes**: Check the [bug label](../../issues?q=is%3Aissue+is%3Aopen+label%3Abug)

### Code Style

- **Rust**: Follow `cargo fmt` and `cargo clippy` defaults
- **TypeScript/React**: Biome handles formatting (run `pnpm lint`)
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Getting Help

- **Discord**: [Join our server](https://discord.gg/YOUR_INVITE) for real-time chat
- **Issues**: Open an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

## Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Given credit in relevant documentation

## Code of Conduct

Be respectful, constructive, and welcoming. We're building this together.

---

Questions? Reach out to @jscraik or open a discussion.
