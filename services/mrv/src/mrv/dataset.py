"""Feature engineering, quantization, spatial split, and Parquet generation."""

from __future__ import annotations

import datetime as dt
import json
import subprocess
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from mrv.fetch import DEFAULT_AOI, DEFAULT_FIXTURES_DIR, fetch_aoi_data
from mrv.geohash import encode_geohash

FEATURE_NAMES: list[str] = [
    "ndvi_mean",
    "ndvi_3m_p10",
    "ndvi_3m_p50",
    "ndvi_3m_p90",
    "ndre_mean",
    "reci_mean",
    "ireci_mean",
    "wc_tree_cover",
    "wc_shrubland",
    "wc_grassland",
    "wc_cropland",
    "wc_wetland",
]

# Deterministic fixed-point quantization parameters per feature:
# q = round(x / scale) + zero_point
QUANTIZATION_PARAMS: dict[str, dict[str, float | int]] = {
    "ndvi_mean": {"scale": 0.001, "zero_point": 0},
    "ndvi_3m_p10": {"scale": 0.001, "zero_point": 0},
    "ndvi_3m_p50": {"scale": 0.001, "zero_point": 0},
    "ndvi_3m_p90": {"scale": 0.001, "zero_point": 0},
    "ndre_mean": {"scale": 0.001, "zero_point": 0},
    "reci_mean": {"scale": 0.001, "zero_point": 0},
    "ireci_mean": {"scale": 0.001, "zero_point": 0},
    "wc_tree_cover": {"scale": 1.0, "zero_point": 0},
    "wc_shrubland": {"scale": 1.0, "zero_point": 0},
    "wc_grassland": {"scale": 1.0, "zero_point": 0},
    "wc_cropland": {"scale": 1.0, "zero_point": 0},
    "wc_wetland": {"scale": 1.0, "zero_point": 0},
}


def _get_git_commit() -> str:
    """Resolve current git commit SHA or return 'unknown' if outside a git repo."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return out if out else "unknown"
    except Exception:  # noqa: BLE001
        return "unknown"


def compute_pixel_features_from_arrays(
    arrays: dict[str, np.ndarray],
) -> tuple[dict[str, np.ndarray], dict[str, np.ndarray]]:
    """Compute raw floating-point and quantized integer features per pixel.

    Features computed per pixel:
    - ``ndvi_mean``: Full growing-season mean NDVI = (B08 - B04) / (B08 + B04)
    - ``ndvi_3m_p10``, ``ndvi_3m_p50``, ``ndvi_3m_p90``: 3-month NDVI percentiles
    - ``ndre_mean``: Normalized Difference Red-Edge Index = (B08 - B05) / (B08 + B05)
    - ``reci_mean``: Red-Edge Chlorophyll Index = (B08 / B05) - 1
    - ``ireci_mean``: Inverted Red-Edge Chlorophyll Index
    - ``wc_*``: Static ESA WorldCover class one-hot encodings (10, 20, 30, 40, 90)
    """
    eps = 1e-6
    b04 = arrays["B04"].astype(np.float64)
    b05 = arrays["B05"].astype(np.float64)
    b06 = arrays["B06"].astype(np.float64)
    b07 = arrays["B07"].astype(np.float64)
    b08 = arrays["B08"].astype(np.float64)
    worldcover = arrays["worldcover"].astype(np.int32)

    ndvi_cube = (b08 - b04) / (b08 + b04 + eps)
    # 3-month peak growing season subset (first 6 scenes = May-Aug 3-month window)
    three_month_len = min(6, ndvi_cube.shape[0])
    ndvi_3m = ndvi_cube[:three_month_len]

    ndre_cube = (b08 - b05) / (b08 + b05 + eps)
    reci_cube = (b08 / (b05 + eps)) - 1.0
    ireci_cube = (b07 - b04) / ((b05 / (b06 + eps)) + eps)
    ireci_scaled = ireci_cube / 1000.0

    raw_features: dict[str, np.ndarray] = {
        "ndvi_mean": np.mean(ndvi_cube, axis=0),
        "ndvi_3m_p10": np.percentile(ndvi_3m, 10, axis=0),
        "ndvi_3m_p50": np.percentile(ndvi_3m, 50, axis=0),
        "ndvi_3m_p90": np.percentile(ndvi_3m, 90, axis=0),
        "ndre_mean": np.mean(ndre_cube, axis=0),
        "reci_mean": np.mean(reci_cube, axis=0),
        "ireci_mean": np.mean(ireci_scaled, axis=0),
        "wc_tree_cover": (worldcover == 10).astype(np.float64),
        "wc_shrubland": (worldcover == 20).astype(np.float64),
        "wc_grassland": (worldcover == 30).astype(np.float64),
        "wc_cropland": (worldcover == 40).astype(np.float64),
        "wc_wetland": (worldcover == 90).astype(np.float64),
    }

    quantized_features: dict[str, np.ndarray] = {}
    for feat_name in FEATURE_NAMES:
        scale = float(QUANTIZATION_PARAMS[feat_name]["scale"])
        zero_point = int(QUANTIZATION_PARAMS[feat_name]["zero_point"])
        quantized_features[feat_name] = (
            np.rint(raw_features[feat_name] / scale).astype(np.int32) + zero_point
        )

    return raw_features, quantized_features


def build_dataset(
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    output_dir: Path | None = None,
    aoi_str: str = DEFAULT_AOI,
    offline: bool = True,
) -> dict[str, Any]:
    """Build the quantized pixel dataset (Parquet) and dataset manifest (JSON).

    Uses a spatial-block train/test split keyed on the 5-character geohash prefix
    (``geohash5``), NOT a random split, to prevent spatial autocorrelation leakage
    between neighboring pixels during evaluation.
    """
    if output_dir is None:
        output_dir = fixtures_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    meta_path = fixtures_dir / "stac_cache.json"
    cube_path = fixtures_dir / "sentinel2_window_cube.npz"
    if not (meta_path.exists() and cube_path.exists()):
        fetch_aoi_data(aoi_str=aoi_str, fixtures_dir=fixtures_dir, offline=offline)

    stac_meta: dict[str, Any] = json.loads(meta_path.read_text(encoding="utf-8"))
    with np.load(cube_path, allow_pickle=False) as npz:
        arrays = {k: npz[k] for k in npz.files}

    raw_feats, quant_feats = compute_pixel_features_from_arrays(arrays)

    lat_flat = arrays["lat_grid"].ravel()
    lon_flat = arrays["lon_grid"].ravel()
    gh5_flat = arrays["geohash5_grid"].ravel()
    agb_flat = arrays["agb_mg_ha"].ravel().astype(np.float64)

    num_pixels = lat_flat.shape[0]
    gh8_list = [
        encode_geohash(float(lat_flat[i]), float(lon_flat[i]), precision=8)
        for i in range(num_pixels)
    ]

    # -------------------------------------------------------------------------
    # SPATIAL-BLOCK TRAIN/TEST SPLIT BY GEOHASH5 PREFIX (NOT RANDOM):
    # Random per-pixel train/test splitting in remote sensing violates independence
    # due to Tobler's First Law of Geography (adjacent pixels share canopy structure,
    # atmospheric path radiance, and soil background), inflating test R² via spatial
    # leakage. Splitting strictly by distinct 5-character geohash (geohash5) blocks
    # ensures all pixels within a held-out spatial block are unseen during training.
    # -------------------------------------------------------------------------
    unique_blocks = sorted(set(str(g) for g in gh5_flat))
    num_test_blocks = max(1, len(unique_blocks) // 4)
    held_out_test_blocks = set(unique_blocks[-num_test_blocks:])
    train_blocks = [b for b in unique_blocks if b not in held_out_test_blocks]

    split_labels = [
        "test" if str(gh5) in held_out_test_blocks else "train" for gh5 in gh5_flat
    ]

    records: dict[str, Any] = {
        "pixel_id": np.arange(num_pixels, dtype=np.int32),
        "lat": lat_flat,
        "lon": lon_flat,
        "geohash5": [str(g) for g in gh5_flat],
        "geohash8": gh8_list,
        "split": split_labels,
    }
    for feat_name in FEATURE_NAMES:
        records[feat_name] = quant_feats[feat_name].ravel()
        records[f"raw_{feat_name}"] = raw_feats[feat_name].ravel()
    records["agb_mg_ha"] = agb_flat

    df = pd.DataFrame(records)
    parquet_path = output_dir / "dataset.parquet"
    df.to_parquet(parquet_path, index=False, engine="pyarrow")

    manifest: dict[str, Any] = {
        "schema_version": "1.0.0",
        "source_collection_ids": stac_meta["collections"],
        "agb_label_source": stac_meta["agb_label_source"],
        "scene_ids": [s["id"] for s in stac_meta["scenes"]],
        "date_list": [s["date"] for s in stac_meta["scenes"]],
        "feature_names": FEATURE_NAMES,
        "quantization": QUANTIZATION_PARAMS,
        "split_strategy": "geohash5_spatial_block (prevents spatial leakage)",
        "train_geohash5_blocks": train_blocks,
        "test_geohash5_blocks": sorted(held_out_test_blocks),
        "num_rows": int(len(df)),
        "num_train_rows": int((df["split"] == "train").sum()),
        "num_test_rows": int((df["split"] == "test").sum()),
        "parquet_path": str(parquet_path),
        "git_commit": _get_git_commit(),
        "utc_timestamp": dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    manifest_path = output_dir / "dataset_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest
