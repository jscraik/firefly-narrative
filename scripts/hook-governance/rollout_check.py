#!/usr/bin/env python3
"""Validate rollout governance readiness from explicit repo inventory input."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate rollout readiness from repo inventory.")
    parser.add_argument(
        "--inventory",
        type=Path,
        required=True,
        help="path to repo-profile inventory JSON. Pass an explicit project-local or workspace inventory file.",
    )
    parser.add_argument("--recovery-slo-hours", type=int, default=24)
    parser.add_argument("--required-gates", default="inventory,classification,docstring-ratchet")
    parser.add_argument("--out", type=Path)
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    args = parse_args()
    inventory = load_json(args.inventory)

    repos = inventory.get("repos", [])
    stale = [repo.get("repo", "unknown") for repo in repos if repo.get("freshness_status") != "fresh"]

    payload: dict[str, Any] = {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "inventory": str(args.inventory.resolve()),
        "recovery_slo_hours": args.recovery_slo_hours,
        "required_gates": [gate.strip() for gate in args.required_gates.split(",") if gate.strip()],
        "repo_count": len(repos),
        "stale_repos": stale,
        "status": "pass" if not stale else "fail",
    }

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    if stale:
        print("[rollout_check] FAIL: stale repos detected -> " + ", ".join(stale))
        return 1

    print("[rollout_check] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
