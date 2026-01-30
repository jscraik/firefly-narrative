# Development

## Prereqs
- Node.js + pnpm
- Rust toolchain
- Tauri system deps for your OS (see Tauri docs)
- git on PATH (repo mode executes git via tauri-plugin-shell)

## Run
- Install deps: pnpm install
- Start app (Tauri): pnpm tauri dev
- Start web-only dev server: pnpm dev

## Build
- Web build: pnpm build
- Tauri build: pnpm tauri build

## Notes
- The app writes narrative metadata under .narrative/ when a repo is opened.
