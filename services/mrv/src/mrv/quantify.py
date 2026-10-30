"""ONNX inference over an AOI, tCO2e aggregation, and EvidenceBundle JSON emission."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as ort

from mrv.dataset import (
    DEFAULT_FIXTURES_DIR,
    FEATURE_NAMES,
    compute_pixel_features_from_arrays,
)
from mrv.fetch import DEFAULT_AOI, SEED, fetch_aoi_data
from mrv.geohash import aoi_to_geohash8, parse_aoi
from mrv.train import sha256_file_hex, train_model

# -----------------------------------------------------------------------------
# Documented Carbon Conversion Factor (tCO2e per metric ton of dry AGB):
# Citation: IPCC (2006) & 2019 Refinement to the 2006 IPCC Guidelines for
# National Greenhouse Gas Inventories, Volume 4 (AFOLU), Chapter 4 (Forest Land),
# Section 4.3, Table 4.3:
#   - Carbon fraction of dry above-ground biomass (CF) = 0.47 tC / t dry matter
#   - Stoichiometric CO2-to-C molar mass ratio = 44.0 / 12.0 = 3.6667 tCO2e / tC
#   => TCO2E_PER_TON_AGB = 0.47 * (44.0 / 12.0) = 1.7233333333333334 tCO2e / Mg AGB
# -----------------------------------------------------------------------------
CARBON_FRACTION_AGB: float = 0.47
CO2_TO_C_RATIO: float = 44.0 / 12.0
TCO2E_PER_TON_AGB: float = CARBON_FRACTION_AGB * CO2_TO_C_RATIO


def compute_aoi_area_hectares(
    min_lon: float, min_lat: float, max_lon: float, max_lat: float
) -> float:
    """Compute geodesic area of a small bounding box in hectares (1 ha = 10,000 m²)."""
    mean_lat_rad = math.radians((min_lat + max_lat) / 2.0)
    meters_per_deg_lat = 111_132.92 - 559.82 * math.cos(2.0 * mean_lat_rad)
    meters_per_deg_lon = 111_412.84 * math.cos(mean_lat_rad)
    width_m = abs(max_lon - min_lon) * meters_per_deg_lon
    height_m = abs(max_lat - min_lat) * meters_per_deg_lat
    area_m2 = width_m * height_m
    return float(area_m2 / 10_000.0)


def canonical_data_commitment(quantized_features: list[int]) -> str:
    """Compute 0x-prefixed SHA-256 hex digest over canonical quantized tensor JSON."""
    canonical_bytes = json.dumps(quantized_features, separators=(",", ":")).encode()
    return "0x" + hashlib.sha256(canonical_bytes).hexdigest()


def _deterministic_salt(aoi_geohash8: str, vintage_year: int, credit_type: int) -> str:
    """Generate a deterministic 32-byte salt seeded by SEED for reproducible runs."""
    payload = f"vericarbon-salt:{SEED}:{aoi_geohash8}:{vintage_year}:{credit_type}"
    return "0x" + hashlib.sha256(payload.encode()).hexdigest()


def quantify_aoi(
    aoi_str: str = DEFAULT_AOI,
    model_path: Path | None = None,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    output_path: Path | None = None,
    project_id: str = "vc-tapajos-001",
    vintage_year: int = 2024,
    credit_type: int = 1,
    salt: str | None = None,
    offline: bool = True,
) -> dict[str, Any]:
    """Run ONNX inference over an AOI, aggregate to tCO2e, and emit EvidenceBundle."""
    min_lon, min_lat, max_lon, max_lat = parse_aoi(aoi_str)

    if model_path is None:
        model_path = fixtures_dir / "model.onnx"
    if not model_path.exists():
        train_model(
            dataset_dir=fixtures_dir,
            output_dir=fixtures_dir,
            onnx_out_path=model_path,
        )

    meta_path = fixtures_dir / "stac_cache.json"
    cube_path = fixtures_dir / "sentinel2_window_cube.npz"
    if not (meta_path.exists() and cube_path.exists()):
        fetch_aoi_data(aoi_str=aoi_str, fixtures_dir=fixtures_dir, offline=offline)

    stac_meta: dict[str, Any] = json.loads(meta_path.read_text(encoding="utf-8"))
    with np.load(cube_path, allow_pickle=False) as npz:
        arrays = {k: npz[k] for k in npz.files}

    raw_feats, quant_feats = compute_pixel_features_from_arrays(arrays)

    num_pixels = arrays["lat_grid"].size
    x_pixels = np.column_stack(
        [quant_feats[feat].ravel().astype(np.float32) for feat in FEATURE_NAMES]
    )
    if x_pixels.shape != (num_pixels, len(FEATURE_NAMES)):
        raise RuntimeError(f"Unexpected feature matrix shape: {x_pixels.shape}")

    sess_options = ort.SessionOptions()
    sess_options.intra_op_num_threads = 1
    sess_options.inter_op_num_threads = 1
    session = ort.InferenceSession(
        str(model_path),
        sess_options=sess_options,
        providers=["CPUExecutionProvider"],
    )
    input_name = session.get_inputs()[0].name
    preds = session.run(None, {input_name: x_pixels})[0]
    pred_agb_per_pixel = np.asarray(preds, dtype=np.float64).ravel()

    mean_agb_mg_ha = float(np.mean(pred_agb_per_pixel))
    area_ha = compute_aoi_area_hectares(min_lon, min_lat, max_lon, max_lat)
    total_agb_tons = mean_agb_mg_ha * area_ha
    predicted_credits_tco2e = round(float(total_agb_tons * TCO2E_PER_TON_AGB), 4)

    feature_stats: dict[str, dict[str, float]] = {}
    for feat_name in FEATURE_NAMES:
        vals = raw_feats[feat_name].ravel().astype(np.float64)
        feature_stats[feat_name] = {
            "min": round(float(np.min(vals)), 6),
            "max": round(float(np.max(vals)), 6),
            "mean": round(float(np.mean(vals)), 6),
            "std": round(float(np.std(vals)), 6),
        }

    canonical_quantized_vector: list[int] = [
        int(np.rint(np.mean(quant_feats[feat]))) for feat in FEATURE_NAMES
    ]

    aoi_gh8 = aoi_to_geohash8(min_lon, min_lat, max_lon, max_lat)
    resolved_salt = (
        salt
        if salt is not None
        else _deterministic_salt(aoi_gh8, vintage_year, credit_type)
    )
    data_commitment = canonical_data_commitment(canonical_quantized_vector)
    model_hash = sha256_file_hex(model_path)

    evidence_bundle: dict[str, Any] = {
        "bundleVersion": "1.0.0",
        "projectId": project_id,
        "aoiGeohash8": aoi_gh8,
        "salt": resolved_salt,
        "sceneIds": [s["id"] for s in stac_meta["scenes"]],
        "featureStats": feature_stats,
        "dataCommitment": data_commitment,
        "modelHash": model_hash,
        "quantizedFeatures": canonical_quantized_vector,
        "predictedCredits": predicted_credits_tco2e,
        "vintageYear": int(vintage_year),
        "creditType": int(credit_type),
    }

    if output_path is None:
        output_path = fixtures_dir / "evidence_bundle.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(evidence_bundle, indent=2) + "\n", encoding="utf-8"
    )
    return evidence_bundle
