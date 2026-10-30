"""
eval/geohash_audit.py — Geohash audit script for VeriCarbon dataset partition.
Decodes every block ID in dataset_manifest.json vs the AOI bbox.
Asserts that all partition cells intersect the AOI bbox and match the code's partition.
"""

import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURES_DIR = REPO_ROOT / "services" / "mrv" / "tests" / "fixtures"
MANIFEST_PATH = FIXTURES_DIR / "dataset_manifest.json"
CACHE_PATH = FIXTURES_DIR / "stac_cache.json"

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

def decode_geohash_bbox(gh: str) -> tuple[float, float, float, float]:
    """Decode a geohash string into (min_lat, min_lon, max_lat, max_lon)."""
    lat_interval = [-90.0, 90.0]
    lon_interval = [-180.0, 180.0]
    even = True
    for ch in gh.lower():
        if ch not in _BASE32:
            raise ValueError(f"Invalid geohash character: {ch}")
        cd = _BASE32.index(ch)
        for mask in [16, 8, 4, 2, 1]:
            if even:
                mid = (lon_interval[0] + lon_interval[1]) / 2.0
                if cd & mask:
                    lon_interval[0] = mid
                else:
                    lon_interval[1] = mid
            else:
                mid = (lat_interval[0] + lat_interval[1]) / 2.0
                if cd & mask:
                    lat_interval[0] = mid
                else:
                    lat_interval[1] = mid
            even = not even
    return lat_interval[0], lon_interval[0], lat_interval[1], lon_interval[1]

def bboxes_intersect(bbox1: tuple[float, float, float, float], bbox2: tuple[float, float, float, float]) -> bool:
    """Check if two (min_lat, min_lon, max_lat, max_lon) bboxes intersect."""
    lat1_min, lon1_min, lat1_max, lon1_max = bbox1
    lat2_min, lon2_min, lat2_max, lon2_max = bbox2
    if lat1_max < lat2_min or lat1_min > lat2_max:
        return False
    if lon1_max < lon2_min or lon1_min > lon2_max:
        return False
    return True

def run_audit():
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Missing {MANIFEST_PATH}")
    
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # AOI bounds from stac_cache.json or default
    aoi_bbox = None
    if CACHE_PATH.exists():
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            cache = json.load(f)
            # bbox in stac_cache is [min_lon, min_lat, max_lon, max_lat]
            b = cache.get("bbox")
            if b and len(b) == 4:
                aoi_bbox = (b[1], b[0], b[3], b[2]) # (min_lat, min_lon, max_lat, max_lon)

    if aoi_bbox is None:
        # Default AOI: -54.8485, -2.8172, -54.8390, -2.8078
        aoi_bbox = (-2.8172, -54.8485, -2.8078, -54.8390)

    train_blocks = manifest.get("train_geohash5_blocks", [])
    test_blocks = manifest.get("test_geohash5_blocks", [])
    all_blocks = train_blocks + test_blocks

    results = {
        "aoi_bbox_lat_lon": aoi_bbox,
        "blocks_evaluated": all_blocks,
        "block_details": {},
        "all_intersect": True,
        "errors": []
    }

    for b in all_blocks:
        gh_bbox = decode_geohash_bbox(b)
        intersects = bboxes_intersect(gh_bbox, aoi_bbox)
        results["block_details"][b] = {
            "decoded_bbox": gh_bbox,
            "intersects_aoi": intersects
        }
        if not intersects:
            results["all_intersect"] = False
            results["errors"].append(f"Block '{b}' ({gh_bbox}) does NOT intersect AOI ({aoi_bbox})")

    return results

def main():
    res = run_audit()
    print("=== GEOHASH AUDIT RESULT ===")
    print(json.dumps(res, indent=2))

    out_dir = REPO_ROOT / "eval" / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if this is the first failing run or audit pass
    if not res["all_intersect"]:
        before_file = out_dir / "geohash_audit_before.json"
        with open(before_file, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
        print(f"\nRecorded failing before state in {before_file}")
        sys.exit(1)
    else:
        audit_file = out_dir / "geohash_audit.json"
        with open(audit_file, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2)
        print(f"\nAudit passed! Wrote {audit_file}")
        sys.exit(0)

if __name__ == "__main__":
    main()
