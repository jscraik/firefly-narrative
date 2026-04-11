#!/usr/bin/env python3
"""Generate hook-governance repo inventory from an explicit manifest."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class RepoRecord:
    repo: str
    path: str
    exists: bool
    freshness_status: str
    reason: str | None = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a repo inventory from a scope manifest.")
    parser.add_argument("--manifest", type=Path, required=True, help="path to repo-scope manifest JSON")
    parser.add_argument("--out", type=Path, required=True, help="path to write inventory JSON")
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_workspace_root(manifest: dict[str, Any], manifest_path: Path) -> Path:
    explicit = manifest.get("workspace_root")
    if explicit:
        return Path(explicit).expanduser().resolve()
    return manifest_path.resolve().parents[2]


def to_repo_name(entry: Any) -> str:
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict) and isinstance(entry.get("name"), str):
        return entry["name"]
    raise ValueError(f"Invalid repo entry: {entry!r}")


def evaluate_repo(repo_name: str, workspace_root: Path) -> RepoRecord:
    repo_path = Path(repo_name)
    if not repo_path.is_absolute():
        repo_path = workspace_root / repo_name
    repo_path = repo_path.resolve()

    git_dir = repo_path / ".git"
    exists = repo_path.exists() and git_dir.exists()
    if exists:
        return RepoRecord(
            repo=repo_name,
            path=str(repo_path),
            exists=True,
            freshness_status="fresh",
        )
    return RepoRecord(
        repo=repo_name,
        path=str(repo_path),
        exists=False,
        freshness_status="stale",
        reason="missing repo root or .git directory",
    )


def main() -> int:
    args = parse_args()

    manifest = load_json(args.manifest)
    repos_block = manifest.get("repos", {})
    in_scope_raw = repos_block.get("in_scope", [])
    excluded = {to_repo_name(item) for item in repos_block.get("excluded", [])}

    workspace_root = resolve_workspace_root(manifest, args.manifest)
    repos = []
    for item in in_scope_raw:
        repo_name = to_repo_name(item)
        if repo_name in excluded:
            continue
        repos.append(evaluate_repo(repo_name, workspace_root))

    stale = [record.repo for record in repos if record.freshness_status != "fresh"]
    payload: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "manifest": str(args.manifest.resolve()),
        "workspace_root": str(workspace_root),
        "status": "pass" if not stale else "fail",
        "stale_repos": stale,
        "repos": [record.__dict__ for record in repos],
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
