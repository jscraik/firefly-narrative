# Firefly Narrative development Makefile
# Run `make help` to see available commands

.PHONY: \
	help install setup hooks \
	dev tauri-dev build tauri-build \
	lint fmt typecheck docs-lint test test-deep test-artifacts check \
	audit secrets security \
	clean reset \
	ci diagrams env-check harness-preflight

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# === Setup ===

install: ## Install dependencies
	pnpm install

setup: install hooks env-check ## Full setup: install deps, configure git hooks, validate environment

hooks: ## Setup git hooks
	node scripts/setup-git-hooks.js

# === Development ===

dev: ## Start development server
	pnpm dev

tauri-dev: ## Start Tauri desktop app
	pnpm tauri dev

build: ## Build for production
	pnpm build

tauri-build: ## Build Tauri desktop bundle
	pnpm tauri build

# === Quality ===

lint: ## Run linter
	pnpm lint

fmt: ## Format code
	pnpm exec biome format --write src src-tauri/src

typecheck: ## Run TypeScript type checking
	pnpm typecheck

docs-lint: ## Lint documentation
	pnpm docs:lint

test: ## Run tests
	pnpm test

test-deep: ## Run deep test suite (unit + integration + a11y)
	pnpm test:deep

test-artifacts: ## Run tests with stable artifact outputs
	pnpm test:artifacts

check: ## Run standard CI checks
	pnpm check

# === Security ===

audit: ## Run security audit
	pnpm audit

secrets: ## Scan for secrets with gitleaks
	@gitleaks detect --source . --verbose || (echo "Install gitleaks: brew install gitleaks" && exit 1)

security: audit secrets ## Run all security checks

# === Maintenance ===

clean: ## Clean build artifacts and caches
	rm -rf dist coverage artifacts .test-traces* .traces
	rm -rf node_modules/.cache

reset: clean ## Full reset: clean and reinstall
	pnpm install

# === CI ===

ci: check test-deep ## Run CI checks (strict parity)

# === Diagrams ===

diagrams: ## Refresh canonical diagrams and sync AI compatibility mirror
	bash scripts/refresh-diagram-context.sh --force
	mkdir -p AI/diagrams AI/context
	cp -f .diagram/*.mmd AI/diagrams/ 2>/dev/null || true
	cp -f .diagram/context/diagram-context.md AI/context/diagram-context.md

# === Environment ===

env-check: ## Validate local development environment
	@bash scripts/check-environment.sh --contract harness.contract.json

harness-preflight: ## Run harness contract preflight gate
	pnpm exec harness preflight-gate --contract harness.contract.json
