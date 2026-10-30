"""Validate paper/evidence_map.json against canonical artifacts under eval/results/.

Fails loudly if any mapped value does not match the actual artifact within specified tolerance.
Usage:
    uv run python eval/validate_evidence_map.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_MAP_PATH = REPO_ROOT / "paper" / "evidence_map.json"


def resolve_json_pointer(data: Any, pointer: str) -> Any:
    """Resolve an RFC 6901 JSON pointer against a Python dict/list structure."""
    if not pointer or pointer == "/":
        return data
    parts = pointer.strip("/").split("/")
    cur = data
    for part in parts:
        part_unescaped = part.replace("~1", "/").replace("~0", "~")
        if isinstance(cur, list):
            idx = int(part_unescaped)
            cur = cur[idx]
        elif isinstance(cur, dict):
            if part_unescaped not in cur:
                raise KeyError(f"Key '{part_unescaped}' not found in dict keys: {list(cur.keys())}")
            cur = cur[part_unescaped]
        else:
            raise TypeError(f"Cannot traverse into scalar value '{cur}' with key '{part_unescaped}'")
    return cur


def validate_evidence_map() -> None:
    if not EVIDENCE_MAP_PATH.exists():
        print(f"ERROR: Evidence map not found at {EVIDENCE_MAP_PATH}")
        sys.exit(1)

    items = json.loads(EVIDENCE_MAP_PATH.read_text(encoding="utf-8"))
    if not isinstance(items, list) or len(items) == 0:
        print("ERROR: evidence_map.json must be a non-empty JSON list.")
        sys.exit(1)

    errors = []
    print(f"Validating {len(items)} evidence map claims against artifacts...\n")

    for entry in items:
        claim_id = entry.get("claim_id", "UNKNOWN")
        target_rel = entry.get("target_file")
        pointer = entry.get("json_pointer")
        canonical_val = entry.get("canonical_value")
        tolerance = entry.get("tolerance", 0.0)
        caption = entry.get("caption", "")

        target_path = REPO_ROOT / target_rel
        if not target_path.exists():
            errors.append(f"[{claim_id}] Missing target file: {target_rel}")
            continue

        try:
            artifact_data = json.loads(target_path.read_text(encoding="utf-8"))
            actual_val = resolve_json_pointer(artifact_data, pointer)
        except Exception as e:
            errors.append(f"[{claim_id}] Failed resolving pointer '{pointer}' in {target_rel}: {e}")
            continue

        # Check numeric match
        try:
            actual_float = float(actual_val)
            canonical_float = float(canonical_val)
            diff = abs(actual_float - canonical_float)
            if diff > tolerance:
                errors.append(
                    f"[{claim_id}] Value mismatch: actual={actual_float}, canonical={canonical_float}, "
                    f"diff={diff:.6f} > tolerance={tolerance} ({caption})"
                )
            else:
                print(f"  [PASS] {claim_id:5s} | {actual_float:12.4f} == {canonical_float:12.4f} (diff={diff:.6f} <= {tolerance}) | {caption}")
        except (ValueError, TypeError) as e:
            # Fallback exact equality for non-numbers
            if actual_val != canonical_val:
                errors.append(
                    f"[{claim_id}] Exact value mismatch: actual='{actual_val}', canonical='{canonical_val}'"
                )
            else:
                print(f"  [PASS] {claim_id:5s} | '{actual_val}' == '{canonical_val}' | {caption}")

    print("\n-------------------------------------------------------------------------------")
    if errors:
        print(f"FAILED: {len(errors)} validation errors detected:")
        for err in errors:
            print(f"  [FAIL] {err}")
        sys.exit(1)
    else:
        print(f"SUCCESS: All {len(items)} claims in paper/evidence_map.json verified against artifacts!")
        print("-------------------------------------------------------------------------------")


if __name__ == "__main__":
    validate_evidence_map()
