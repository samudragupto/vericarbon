"""Offline test suite for the VeriCarbon MRV pipeline CLI and domain modules."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from typer.testing import CliRunner

from mrv.cli import app
from mrv.dataset import FEATURE_NAMES
from mrv.fetch import DEFAULT_AOI, DEFAULT_FIXTURES_DIR
from mrv.geohash import encode_geohash

runner = CliRunner()


def test_hello_command() -> None:
    """Verify that `mrv hello` exits cleanly and prints the greeting."""
    result = runner.invoke(app, ["hello"])
    assert result.exit_code == 0
    assert "Hello from VeriCarbon MRV pipeline!" in result.stdout


def test_geohash_determinism() -> None:
    """Verify geohash5 and geohash8 encoding determinism."""
    gh8 = encode_geohash(-2.8125, -54.84375, precision=8)
    assert len(gh8) == 8
    assert gh8[:5] == encode_geohash(-2.8125, -54.84375, precision=5)


def test_full_mrv_pipeline_offline(tmp_path: Path) -> None:
    """Run fetch -> build-dataset -> train -> quantify strictly offline."""
    # 1. mrv fetch (offline mode caches under tmp_path)
    fetch_res = runner.invoke(
        app,
        [
            "fetch",
            "--aoi",
            DEFAULT_AOI,
            "--fixtures-dir",
            str(tmp_path),
            "--offline",
        ],
    )
    assert fetch_res.exit_code == 0, fetch_res.stdout
    fetch_payload = json.loads(fetch_res.stdout)
    assert 6 <= fetch_payload["scenes_retained"] <= 12
    assert (tmp_path / "stac_cache.json").exists()
    assert (tmp_path / "sentinel2_window_cube.npz").exists()

    # 2. mrv build-dataset
    ds_res = runner.invoke(
        app,
        [
            "build-dataset",
            "--fixtures-dir",
            str(tmp_path),
            "--output-dir",
            str(tmp_path),
        ],
    )
    assert ds_res.exit_code == 0, ds_res.stdout
    manifest = json.loads(ds_res.stdout)
    assert manifest["feature_names"] == FEATURE_NAMES
    assert len(manifest["scene_ids"]) == fetch_payload["scenes_retained"]
    assert len(manifest["date_list"]) == fetch_payload["scenes_retained"]
    assert "quantization" in manifest
    assert "git_commit" in manifest
    assert "utc_timestamp" in manifest

    # Verify spatial-block split by geohash5 prefix has zero block overlap
    train_blocks = set(manifest["train_geohash5_blocks"])
    test_blocks = set(manifest["test_geohash5_blocks"])
    assert len(train_blocks) >= 1
    assert len(test_blocks) >= 1
    assert train_blocks.isdisjoint(test_blocks)

    df = pd.read_parquet(tmp_path / "dataset.parquet")
    assert set(df[df["split"] == "train"]["geohash5"]).isdisjoint(
        set(df[df["split"] == "test"]["geohash5"])
    )

    # 3. mrv train
    model_path = tmp_path / "model.onnx"
    train_res = runner.invoke(
        app,
        [
            "train",
            "--dataset-dir",
            str(tmp_path),
            "--output-dir",
            str(tmp_path),
            "--model-out",
            str(model_path),
        ],
    )
    assert train_res.exit_code == 0, train_res.stdout
    card = json.loads(train_res.stdout)
    assert model_path.exists()
    assert card["model_hash"].startswith("0x") and len(card["model_hash"]) == 66
    assert card["metrics"]["r2"] > 0.80
    assert card["metrics"]["mae"] > 0.0
    assert card["metrics"]["rmse"] > 0.0
    assert card["feature_list"] == FEATURE_NAMES

    # 4. mrv quantify
    bundle_path = tmp_path / "evidence_bundle.json"
    quant_res = runner.invoke(
        app,
        [
            "quantify",
            "--aoi",
            DEFAULT_AOI,
            "--model",
            str(model_path),
            "--fixtures-dir",
            str(tmp_path),
            "--output",
            str(bundle_path),
        ],
    )
    assert quant_res.exit_code == 0, quant_res.stdout
    bundle = json.loads(quant_res.stdout)
    assert bundle_path.exists()

    required_keys = {
        "bundleVersion",
        "projectId",
        "aoiGeohash8",
        "salt",
        "sceneIds",
        "featureStats",
        "dataCommitment",
        "modelHash",
        "quantizedFeatures",
        "predictedCredits",
        "vintageYear",
        "creditType",
    }
    assert required_keys.issubset(bundle.keys())
    assert len(bundle["aoiGeohash8"]) == 8
    assert bundle["salt"].startswith("0x") and len(bundle["salt"]) == 66
    assert (
        bundle["dataCommitment"].startswith("0x")
        and len(bundle["dataCommitment"]) == 66
    )
    assert bundle["modelHash"] == card["model_hash"]
    assert len(bundle["quantizedFeatures"]) == len(FEATURE_NAMES)
    assert all(isinstance(v, int) for v in bundle["quantizedFeatures"])
    assert bundle["predictedCredits"] > 0.0


def test_committed_fixtures_offline() -> None:
    """Verify that committed fixtures under services/mrv/tests/fixtures exist."""
    assert (DEFAULT_FIXTURES_DIR / "stac_cache.json").exists()
    assert (DEFAULT_FIXTURES_DIR / "sentinel2_window_cube.npz").exists()
    assert (DEFAULT_FIXTURES_DIR / "dataset.parquet").exists()
    assert (DEFAULT_FIXTURES_DIR / "dataset_manifest.json").exists()
    assert (DEFAULT_FIXTURES_DIR / "model.onnx").exists()
    assert (DEFAULT_FIXTURES_DIR / "model_card.json").exists()
    assert (DEFAULT_FIXTURES_DIR / "evidence_bundle.json").exists()
