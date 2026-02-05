# Repair Agent (Autonomous CI Fixer)

This agent automates CI repair workflows for Narrative by monitoring a branch, cloning the repo at the failing commit, reading CI logs, and iterating on fixes until verification passes.

## Goals

- Watch a branch for CI failures (polling or webhook).
- Check out the failing commit in a clean workspace.
- Pull CI logs to classify the failure (test/lint/type/dependency).
- Use **Glob**, **Read**, and **Edit** helpers to gather context and apply patches.
- Run a verify command locally to confirm the fix.
- Iterate up to 5 times per failure.
- Commit and open a PR when repairs succeed.

## Usage

### Local loop (start here)

Runs a continuous repair loop in the current repo. It checks `git status`, runs the verify command, and attempts automated fixes until tests pass.

```bash
pnpm repair:agent -- --mode=local-loop --verify="pnpm test"
```

### Polling mode (CI watcher)

```bash
pnpm repair:agent -- --mode=poll --repo=https://github.com/OWNER/REPO.git --branch=main
```

### Webhook mode (CI watcher)

```bash
pnpm repair:agent -- --mode=webhook --repo=https://github.com/OWNER/REPO.git --branch=main --port=7331
```

> **Note:** Webhook mode expects `workflow_run` events from GitHub. Add a webhook that posts `workflow_run` events to `http://your-host:7331`.

## Configuration

- `REPAIR_VERIFY_CMD` (default: `pnpm test`)
- `REPAIR_MAX_ITERATIONS` (default: `5`)
- `REPAIR_POLL_INTERVAL_MS` (default: `60000`)
- `REPAIR_REPO_URL` / `REPAIR_BRANCH`
- `REPAIR_WORKDIR` (default: OS temp dir `repair-agent/`)
- `REPAIR_LINT_FIX_CMD` (default: `pnpm biome check src src-tauri/src --write`)
- `REPAIR_LLM_CMD` (optional) command that accepts JSON via stdin and emits JSON with a `patch` field

### LLM command contract

If `REPAIR_LLM_CMD` is set, the script will call it with JSON input:

```json
{
  "failureType": "test | lint | type | dependency | unknown",
  "log": "CI log output (truncated)",
  "files": [
    {
      "path": "src/example.ts",
      "content": "file contents (truncated)"
    }
  ]
}
```

The command must return JSON:

```json
{
  "patch": "diff --git ...",
  "message": "Short commit message override"
}
```

The patch is applied with `git apply` (Edit tool equivalent).

## Notes

- Requires `git` and `gh` (GitHub CLI) for CI log access + PR creation.
- Ensure `gh auth login` is configured in the environment running the agent.
- Lint auto-fixes run before LLM fixes when lint failures are detected.
