# Harness Development Makefile
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

setup: install hooks ## Full setup: install deps and configure git hooks

hooks: ## Setup git hooks
	pnpm exec simple-git-hooks

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

check: lint docs-lint typecheck test ## Run standard CI checks

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

ci: check audit ## Run CI checks (check + audit)

# === Diagrams ===

diagrams: ## Generate architecture diagrams
	bash scripts/refresh-diagram-context.sh --force

# === Environment ===

env-check: ## Validate local development environment
	@bash scripts/check-environment.sh

harness-preflight: ## Run harness contract preflight gate
	pnpm exec harness preflight-gate --contract harness.contract.json
