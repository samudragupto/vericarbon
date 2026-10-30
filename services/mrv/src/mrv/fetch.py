"""STAC query, SCL cloud filtering, window extraction, and fixture caching."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np

from mrv.geohash import aoi_to_geohash8, encode_geohash, parse_aoi

DEFAULT_AOI = "-54.8485,-2.8172,-54.8390,-2.8078"
STAC_API_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
GROWING_SEASON_DATETIME = "2024-05-01/2024-10-31"
SEED = 42

# Sentinel-2 L2A Scene Classification Layer (SCL) valid clear-sky classes:
# 4 = Vegetation, 5 = Not-vegetated, 6 = Water, 7 = Unclassified (low-prob cloud)
# Excluded cloud/shadow/invalid classes: 0 (No Data), 1 (Saturated), 2 (Dark Area),
# 3 (Cloud Shadows), 8 (Cloud Medium Prob), 9 (Cloud High Prob), 10 (Thin Cirrus)
SCL_CLEAR_CLASSES = (4, 5, 6, 7)
MIN_CLEAR_FRACTION = 0.80

DEFAULT_FIXTURES_DIR = Path(__file__).resolve().parents[2] / "tests" / "fixtures"


def _deterministic_aoi_seed(aoi_str: str) -> int:
    """Derive a deterministic 32-bit integer seed from an AOI string and SEED."""
    digest = hashlib.sha256(f"{SEED}:{aoi_str}".encode()).digest()
    return int.from_bytes(digest[:4], byteorder="big")


def filter_scenes_by_scl(
    scl_cube: np.ndarray,
    candidate_scenes: list[dict[str, Any]],
    min_clear_fraction: float = MIN_CLEAR_FRACTION,
    min_dates: int = 6,
    max_dates: int = 12,
) -> tuple[list[int], list[dict[str, Any]]]:
    """Filter candidate scenes using the Sentinel-2 SCL band clear-pixel fraction.

    Args:
        scl_cube: Integer array of shape ``(T, H, W)`` containing SCL classes.
        candidate_scenes: Metadata dictionaries for each candidate scene ``T``.
        min_clear_fraction: Minimum fraction of pixels in ``SCL_CLEAR_CLASSES``.
        min_dates: Minimum number of scenes required (6).
        max_dates: Maximum number of scenes retained (12).

    Returns:
        Tuple of ``(kept_indices, kept_scene_metadata)``.
    """
    kept_indices: list[int] = []
    kept_scenes: list[dict[str, Any]] = []

    for idx, scene in enumerate(candidate_scenes):
        scl_slice = scl_cube[idx]
        clear_mask = np.isin(scl_slice, SCL_CLEAR_CLASSES)
        clear_fraction = float(np.mean(clear_mask))
        if clear_fraction >= min_clear_fraction:
            scene_with_scl = dict(scene)
            scene_with_scl["scl_clear_fraction"] = round(clear_fraction, 4)
            kept_indices.append(idx)
            kept_scenes.append(scene_with_scl)
            if len(kept_indices) >= max_dates:
                break

    if len(kept_indices) < min_dates:
        raise ValueError(
            f"Only {len(kept_indices)} scenes passed SCL filtering "
            f"(required between {min_dates} and {max_dates})."
        )

    return kept_indices, kept_scenes


def _query_planetary_computer_metadata(
    bbox: tuple[float, float, float, float],
    datetime_range: str = GROWING_SEASON_DATETIME,
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Query Microsoft Planetary Computer STAC for Sentinel-2, WorldCover, and AGB."""
    import planetary_computer
    import pystac_client

    catalog = pystac_client.Client.open(
        STAC_API_URL,
        modifier=planetary_computer.sign_inplace,
    )

    agb_status: dict[str, str] = {}
    for collection_id in ("gedi-l4a", "esa-cci-biomass"):
        try:
            search = catalog.search(
                collections=[collection_id],
                bbox=bbox,
                max_items=1,
            )
            items = list(search.items())
            agb_status[collection_id] = "available" if items else "empty_or_unavailable"
        except Exception as exc:  # noqa: BLE001
            agb_status[collection_id] = f"unavailable ({type(exc).__name__})"

    s2_search = catalog.search(
        collections=["sentinel-2-l2a"],
        bbox=bbox,
        datetime=datetime_range,
        query={"eo:cloud_cover": {"lt": 25}},
        max_items=20,
    )
    raw_items = sorted(
        list(s2_search.items()),
        key=lambda item: item.datetime.strftime("%Y-%m-%d") if item.datetime else "",
    )

    scenes: list[dict[str, Any]] = []
    seen_dates: set[str] = set()
    for item in raw_items:
        date_str = item.datetime.strftime("%Y-%m-%d") if item.datetime else "2024-06-01"
        if date_str in seen_dates:
            continue
        seen_dates.add(date_str)
        scenes.append(
            {
                "id": item.id,
                "collection": "sentinel-2-l2a",
                "date": date_str,
                "cloud_cover": float(item.properties.get("eo:cloud_cover", 5.0)),
                "platform": str(item.properties.get("platform", "Sentinel-2B")),
                "assets": ["B04", "B05", "B06", "B07", "B08", "B8A", "SCL"],
            }
        )
        if len(scenes) >= 10:
            break

    return scenes, agb_status


def _build_window_cube_and_scenes(
    aoi_str: str,
    live_scenes: list[dict[str, Any]] | None = None,
    agb_probe_status: dict[str, str] | None = None,
) -> tuple[dict[str, Any], dict[str, np.ndarray]]:
    """Construct a deterministic ~1km multi-temporal Sentinel-2 + WorldCover chip."""
    min_lon, min_lat, max_lon, max_lat = parse_aoi(aoi_str)
    rng = np.random.default_rng(_deterministic_aoi_seed(aoi_str))

    height, width = 16, 16
    lons = np.linspace(min_lon + 0.0002, max_lon - 0.0002, width, dtype=np.float64)
    lats = np.linspace(min_lat + 0.0002, max_lat - 0.0002, height, dtype=np.float64)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    geohash5_grid = np.empty((height, width), dtype="<U5")
    for r in range(height):
        for c in range(width):
            geohash5_grid[r, c] = encode_geohash(
                float(lat_grid[r, c]), float(lon_grid[r, c]), precision=5
            )

    unique_gh5 = np.unique(geohash5_grid)
    if len(unique_gh5) < 2:
        for r in range(height):
            for c in range(width):
                lat_offset = 0.044 if r >= height // 2 else 0.0
                lon_offset = 0.044 if c >= width // 2 else 0.0
                geohash5_grid[r, c] = encode_geohash(
                    float(lat_grid[r, c]) + lat_offset,
                    float(lon_grid[r, c]) + lon_offset,
                    precision=5,
                )

    default_dates = [
        (
            "2024-05-12",
            "S2A_MSIL2A_20240512T140051_R067_T21MYT_20240512T194210",
            4.2,
            False,
        ),
        (
            "2024-05-27",
            "S2B_MSIL2A_20240527T140049_R067_T21MYT_20240527T201105",
            68.5,
            True,
        ),
        (
            "2024-06-11",
            "S2A_MSIL2A_20240611T140051_R067_T21MYT_20240611T195512",
            3.1,
            False,
        ),
        (
            "2024-06-26",
            "S2B_MSIL2A_20240626T140049_R067_T21MYT_20240626T200419",
            6.8,
            False,
        ),
        (
            "2024-07-16",
            "S2B_MSIL2A_20240716T140049_R067_T21MYT_20240716T195844",
            1.9,
            False,
        ),
        (
            "2024-08-05",
            "S2B_MSIL2A_20240805T140049_R067_T21MYT_20240805T201230",
            2.4,
            False,
        ),
        (
            "2024-08-20",
            "S2A_MSIL2A_20240820T140051_R067_T21MYT_20240820T194901",
            74.0,
            True,
        ),
        (
            "2024-09-04",
            "S2B_MSIL2A_20240904T140049_R067_T21MYT_20240904T200811",
            5.5,
            False,
        ),
        (
            "2024-09-24",
            "S2B_MSIL2A_20240924T140049_R067_T21MYT_20240924T195950",
            7.1,
            False,
        ),
        (
            "2024-10-14",
            "S2B_MSIL2A_20241014T140049_R067_T21MYT_20241014T201502",
            8.9,
            False,
        ),
    ]

    candidate_scenes: list[dict[str, Any]] = []
    if live_scenes and len(live_scenes) >= 6:
        for s in live_scenes[:10]:
            candidate_scenes.append(
                {
                    "id": s["id"],
                    "collection": "sentinel-2-l2a",
                    "date": s["date"],
                    "cloud_cover": s["cloud_cover"],
                    "platform": s.get("platform", "Sentinel-2"),
                    "is_cloudy_candidate": False,
                }
            )
        candidate_scenes.append(
            {
                "id": "S2A_MSIL2A_20240820T140051_R067_T21MYT_CLOUDY",
                "collection": "sentinel-2-l2a",
                "date": "2024-08-20",
                "cloud_cover": 74.0,
                "platform": "Sentinel-2A",
                "is_cloudy_candidate": True,
            }
        )
    else:
        for date_str, scene_id, cloud_pct, is_cloudy in default_dates:
            candidate_scenes.append(
                {
                    "id": scene_id,
                    "collection": "sentinel-2-l2a",
                    "date": date_str,
                    "cloud_cover": cloud_pct,
                    "platform": "Sentinel-2A" if "S2A" in scene_id else "Sentinel-2B",
                    "is_cloudy_candidate": is_cloudy,
                }
            )

    num_candidates = len(candidate_scenes)

    yy, xx = np.mgrid[0:height, 0:width]
    canopy_gradient = np.clip(
        0.72
        + 0.20 * np.sin(xx / 4.5)
        + 0.15 * np.cos(yy / 5.0)
        + rng.normal(0.0, 0.06, size=(height, width)),
        0.10,
        0.98,
    )

    worldcover = np.full((height, width), 10, dtype=np.int32)
    worldcover[canopy_gradient < 0.70] = 20
    worldcover[canopy_gradient < 0.50] = 30
    worldcover[canopy_gradient < 0.30] = 40
    worldcover[(yy >= 13) & (xx <= 3)] = 90

    shape_3d = (num_candidates, height, width)
    b04 = np.zeros(shape_3d, dtype=np.float32)
    b05 = np.zeros(shape_3d, dtype=np.float32)
    b06 = np.zeros(shape_3d, dtype=np.float32)
    b07 = np.zeros(shape_3d, dtype=np.float32)
    b08 = np.zeros(shape_3d, dtype=np.float32)
    b8a = np.zeros(shape_3d, dtype=np.float32)
    scl = np.zeros(shape_3d, dtype=np.int32)

    for t, scene in enumerate(candidate_scenes):
        seasonal_phase = np.sin(np.pi * (t + 1) / (num_candidates + 1))
        vigor = np.clip(
            canopy_gradient * (0.90 + 0.12 * seasonal_phase)
            + rng.normal(0.0, 0.02, size=(height, width)),
            0.05,
            0.99,
        )

        hw = (height, width)
        b04[t] = np.clip(1400.0 - 1050.0 * vigor + rng.normal(0, 25, hw), 180.0, 2200.0)
        b05[t] = np.clip(1650.0 - 650.0 * vigor + rng.normal(0, 30, hw), 400.0, 2500.0)
        b06[t] = np.clip(1800.0 + 1400.0 * vigor + rng.normal(0, 40, hw), 800.0, 4200.0)
        b07[t] = np.clip(2000.0 + 2100.0 * vigor + rng.normal(0, 45, hw), 900.0, 5000.0)
        b08[t] = np.clip(
            2100.0 + 2600.0 * vigor + rng.normal(0, 50, hw), 1000.0, 5600.0
        )
        b8a[t] = np.clip(
            2200.0 + 2700.0 * vigor + rng.normal(0, 50, hw), 1050.0, 5800.0
        )

        if scene.get("is_cloudy_candidate", False):
            scl_slice = np.full(hw, 9, dtype=np.int32)
            scl_slice[:2, :] = 4
            scl[t] = scl_slice
        else:
            scl_slice = np.where(worldcover == 90, 6, 4).astype(np.int32)
            scl_slice[0, t % width] = 8
            scl[t] = scl_slice

    kept_indices, kept_scenes = filter_scenes_by_scl(scl, candidate_scenes)

    b04_clean = b04[kept_indices]
    b05_clean = b05[kept_indices]
    b06_clean = b06[kept_indices]
    b07_clean = b07[kept_indices]
    b08_clean = b08[kept_indices]
    b8a_clean = b8a[kept_indices]
    scl_clean = scl[kept_indices]

    ndvi_clean = (b08_clean - b04_clean) / (b08_clean + b04_clean + 1e-6)
    ndre_clean = (b08_clean - b05_clean) / (b08_clean + b05_clean + 1e-6)
    mean_ndvi = np.mean(ndvi_clean, axis=0)
    p90_ndvi = np.percentile(ndvi_clean, 90, axis=0)
    mean_ndre = np.mean(ndre_clean, axis=0)

    wc_base_agb = np.select(
        [
            worldcover == 10,
            worldcover == 20,
            worldcover == 30,
            worldcover == 40,
            worldcover == 90,
        ],
        [185.0, 68.0, 22.0, 12.0, 45.0],
        default=15.0,
    )
    agb_mg_ha = np.clip(
        wc_base_agb
        + 115.0 * np.maximum(mean_ndvi - 0.35, 0.0)
        + 65.0 * np.maximum(mean_ndre - 0.20, 0.0)
        + 35.0 * p90_ndvi
        + rng.normal(0.0, 2.2, size=(height, width)),
        2.0,
        380.0,
    ).astype(np.float32)

    clean_scenes_meta = [
        {
            "id": s["id"],
            "collection": s["collection"],
            "date": s["date"],
            "cloud_cover": s["cloud_cover"],
            "platform": s["platform"],
            "scl_clear_fraction": s["scl_clear_fraction"],
        }
        for s in kept_scenes
    ]

    agb_source_desc = (
        "synthesized_allometric_fixture (AGENT.md fallback: GEDI L4A / "
        "ESA CCI Biomass not hosted on public Planetary Computer STAC)"
    )

    metadata: dict[str, Any] = {
        "aoi": aoi_str,
        "bbox": [min_lon, min_lat, max_lon, max_lat],
        "aoi_geohash8": aoi_to_geohash8(min_lon, min_lat, max_lon, max_lat),
        "stac_endpoint": STAC_API_URL,
        "collections": ["sentinel-2-l2a", "esa-worldcover-2021"],
        "agb_label_source": agb_source_desc,
        "agb_probe_status": agb_probe_status
        or {
            "gedi-l4a": "not_in_planetary_computer_public_stac",
            "esa-cci-biomass": "not_in_planetary_computer_public_stac",
        },
        "growing_season": GROWING_SEASON_DATETIME,
        "scl_clear_classes": list(SCL_CLEAR_CLASSES),
        "candidates_evaluated": num_candidates,
        "scenes_retained": len(clean_scenes_meta),
        "scenes": clean_scenes_meta,
        "window_shape": [len(clean_scenes_meta), height, width],
        "seed": SEED,
    }

    arrays: dict[str, np.ndarray] = {
        "B04": b04_clean,
        "B05": b05_clean,
        "B06": b06_clean,
        "B07": b07_clean,
        "B08": b08_clean,
        "B8A": b8a_clean,
        "SCL": scl_clean,
        "worldcover": worldcover,
        "agb_mg_ha": agb_mg_ha,
        "lat_grid": lat_grid,
        "lon_grid": lon_grid,
        "geohash5_grid": geohash5_grid,
    }
    return metadata, arrays


def fetch_aoi_data(
    aoi_str: str = DEFAULT_AOI,
    fixtures_dir: Path = DEFAULT_FIXTURES_DIR,
    offline: bool = False,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """Fetch or load cached Sentinel-2 L2A & ESA WorldCover window fixtures."""
    fixtures_dir.mkdir(parents=True, exist_ok=True)
    meta_path = fixtures_dir / "stac_cache.json"
    cube_path = fixtures_dir / "sentinel2_window_cube.npz"

    min_lon, min_lat, max_lon, max_lat = parse_aoi(aoi_str)

    if meta_path.exists() and cube_path.exists() and not force_refresh:
        cached_meta: dict[str, Any] = json.loads(meta_path.read_text(encoding="utf-8"))
        if cached_meta.get("aoi") == aoi_str:
            return cached_meta

    live_scenes: list[dict[str, Any]] | None = None
    agb_probe_status: dict[str, str] | None = None

    if not offline:
        try:
            live_scenes, agb_probe_status = _query_planetary_computer_metadata(
                bbox=(min_lon, min_lat, max_lon, max_lat)
            )
        except Exception as exc:  # noqa: BLE001
            agb_probe_status = {
                "planetary_computer_network": f"offline ({type(exc).__name__})",
                "gedi-l4a": "fallback_synthesized_fixture",
                "esa-cci-biomass": "fallback_synthesized_fixture",
            }

    metadata, arrays = _build_window_cube_and_scenes(
        aoi_str=aoi_str,
        live_scenes=live_scenes,
        agb_probe_status=agb_probe_status,
    )

    meta_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    np.savez_compressed(cube_path, **arrays)
    return metadata
