#!/usr/bin/env python3
"""Evaluate docstring ratchet using explicit classification and metrics inputs."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate docstring ratchet status.")
    parser.add_argument(
        "--classification",
        type=Path,
        required=True,
        help="path to public API classification JSON. Pass an explicit project-local or workspace file.",
    )
    parser.add_argument(
        "--metrics",
        type=Path,
        required=True,
        help="path to docstring ratchet metrics JSON. Pass an explicit project-local or workspace file.",
    )
    parser.add_argument("--window-days", type=int, default=14)
    parser.add_argument("--out", type=Path)
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    args = parse_args()
    classification = load_json(args.classification)
    metrics = load_json(args.metrics)

    minimum_ratio = float(metrics.get("minimum_coverage_ratio", 0.0))
    repo_metrics = metrics.get("repos", {})

    failures: list[str] = []
    for repo in classification.get("repos", []):
        repo_name = repo.get("repo", "unknown")
        coverage_ratio = float(repo_metrics.get(repo_name, {}).get("coverage_ratio", 0.0))
        if coverage_ratio < minimum_ratio:
            failures.append(repo_name)

    payload: dict[str, Any] = {
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "classification": str(args.classification.resolve()),
        "metrics": str(args.metrics.resolve()),
        "window_days": args.window_days,
        "minimum_coverage_ratio": minimum_ratio,
        "failed_repos": failures,
        "status": "pass" if not failures else "fail",
    }

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    if failures:
        print("[evaluate_docstring_ratchet] FAIL: coverage below threshold -> " + ", ".join(failures))
        return 1

    print("[evaluate_docstring_ratchet] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
