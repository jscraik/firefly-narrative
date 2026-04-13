#!/usr/bin/env python3
"""Classify public API scope per repo from an explicit inventory input."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Classify public API coverage from repo inventory.")
    parser.add_argument("--inventory", type=Path, required=True, help="path to inventory JSON")
    parser.add_argument("--out", type=Path, required=True, help="path to write classification JSON")
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    args = parse_args()

    inventory = load_json(args.inventory)
    repos = inventory.get("repos", [])

    records = []
    for repo in repos:
        repo_name = repo.get("repo", "unknown")
        freshness_status = repo.get("freshness_status", "stale")
        records.append(
            {
                "repo": repo_name,
                "freshness_status": freshness_status,
                "public_api_surface": "unknown",
                "classification_status": "ok" if freshness_status == "fresh" else "blocked",
            }
        )

    failed = [record["repo"] for record in records if record["classification_status"] != "ok"]
    payload: dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "inventory": str(args.inventory.resolve()),
        "status": "pass" if not failed else "fail",
        "failed_repos": failed,
        "repos": records,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
