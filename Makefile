# Harness Development Makefile
# Run `make help` to see available commands

.PHONY: help install setup hooks dev build lint docs-lint fmt typecheck test check audit secrets security clean reset ci diagrams env-check

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
	node scripts/setup-git-hooks.js

# === Development ===

dev: ## Start development server
	pnpm dev

build: ## Build for production
	pnpm build

# === Quality ===

lint: ## Run linter
	pnpm lint

docs-lint: ## Lint markdown/docs
	pnpm docs:lint

fmt: ## Format code
	pnpm fmt

typecheck: ## Run TypeScript type checking
	pnpm typecheck

test: ## Run tests
	pnpm test

check: ## Run all required quality gates
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

ci: ## Run CI-equivalent local checks
	pnpm check

# === Diagrams ===

diagrams: ## Generate architecture diagrams
	pnpm exec diagram all . --output-dir .diagram

# === Environment ===

env-check: ## Check environment policy envelope
	@./scripts/check-environment.sh
