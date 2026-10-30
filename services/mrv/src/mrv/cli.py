"""Command-line interface for the VeriCarbon MRV pipeline."""

from __future__ import annotations

import json
from pathlib import Path

import typer

from mrv.dataset import build_dataset as run_build_dataset
from mrv.fetch import DEFAULT_AOI, DEFAULT_FIXTURES_DIR, fetch_aoi_data
from mrv.quantify import quantify_aoi
from mrv.train import train_model

app = typer.Typer(
    name="mrv",
    help="VeriCarbon MRV CLI: fetch -> build-dataset -> train -> quantify.",
    add_completion=False,
)


@app.callback()
def main() -> None:
    """VeriCarbon MRV CLI entrypoint."""


@app.command()
def hello(name: str = typer.Option("VeriCarbon", help="Name to greet.")) -> None:
    """Print a deterministic greeting from the VeriCarbon MRV pipeline."""
    typer.echo(f"Hello from {name} MRV pipeline!")


@app.command("fetch")
def fetch_cmd(
    aoi: str = typer.Option(
        DEFAULT_AOI,
        "--aoi",
        help="AOI bounding box 'minLon,minLat,maxLon,maxLat' (~1km chip).",
    ),
    fixtures_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_FIXTURES_DIR,
        "--fixtures-dir",
        help="Directory to store/read cached STAC and window fixtures.",
    ),
    offline: bool = typer.Option(
        False,
        "--offline",
        help="Run strictly offline using cached/deterministic fixtures.",
    ),
) -> None:
    """Query Planetary Computer STAC, filter with SCL, and cache window fixtures."""
    meta = fetch_aoi_data(aoi_str=aoi, fixtures_dir=fixtures_dir, offline=offline)
    typer.echo(
        json.dumps(
            {
                "status": "ok",
                "aoi": meta["aoi"],
                "aoi_geohash8": meta["aoi_geohash8"],
                "scenes_retained": meta["scenes_retained"],
                "window_shape": meta["window_shape"],
                "fixtures_dir": str(fixtures_dir),
            },
            indent=2,
        )
    )


@app.command("build-dataset")
def build_dataset_cmd(
    fixtures_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_FIXTURES_DIR,
        "--fixtures-dir",
        help="Directory containing cached STAC and window fixtures.",
    ),
    output_dir: Path | None = typer.Option(  # noqa: B008
        None,
        "--output-dir",
        help="Output directory for dataset.parquet and dataset_manifest.json.",
    ),
    aoi: str = typer.Option(
        DEFAULT_AOI,
        "--aoi",
        help="AOI bounding box used if fixtures must be initialized.",
    ),
) -> None:
    """Compute pixel features, split by geohash5, and emit Parquet + manifest."""
    manifest = run_build_dataset(
        fixtures_dir=fixtures_dir,
        output_dir=output_dir,
        aoi_str=aoi,
        offline=True,
    )
    typer.echo(json.dumps(manifest, indent=2))


@app.command("train")
def train_cmd(
    dataset_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_FIXTURES_DIR,
        "--dataset-dir",
        help="Directory containing dataset.parquet and dataset_manifest.json.",
    ),
    output_dir: Path | None = typer.Option(  # noqa: B008
        None,
        "--output-dir",
        help="Directory to write model.onnx and model_card.json.",
    ),
    model_out: Path | None = typer.Option(  # noqa: B008
        None,
        "--model-out",
        help="Explicit path for exported ONNX model.",
    ),
) -> None:
    """Train HistGradientBoostingRegressor on quantized features and export ONNX."""
    card = train_model(
        dataset_dir=dataset_dir,
        output_dir=output_dir,
        onnx_out_path=model_out,
    )
    typer.echo(json.dumps(card, indent=2))


@app.command("quantify")
def quantify_cmd(
    aoi: str = typer.Option(
        DEFAULT_AOI,
        "--aoi",
        help="AOI bounding box 'minLon,minLat,maxLon,maxLat'.",
    ),
    model: Path = typer.Option(  # noqa: B008
        DEFAULT_FIXTURES_DIR / "model.onnx",
        "--model",
        help="Path to exported ONNX model.",
    ),
    fixtures_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_FIXTURES_DIR,
        "--fixtures-dir",
        help="Directory containing cached STAC and window fixtures.",
    ),
    output: Path | None = typer.Option(  # noqa: B008
        None,
        "--output",
        help="Output path for the emitted EvidenceBundle JSON.",
    ),
    project_id: str = typer.Option(
        "vc-tapajos-001",
        "--project-id",
        help="Optional project identifier.",
    ),
    vintage_year: int = typer.Option(
        2024,
        "--vintage-year",
        help="Credit vintage year.",
    ),
    credit_type: int = typer.Option(
        1,
        "--credit-type",
        help="Credit type enum integer.",
    ),
) -> None:
    """Run ONNX inference over an AOI and emit an EvidenceBundle JSON."""
    bundle = quantify_aoi(
        aoi_str=aoi,
        model_path=model,
        fixtures_dir=fixtures_dir,
        output_path=output,
        project_id=project_id,
        vintage_year=vintage_year,
        credit_type=credit_type,
        offline=True,
    )
    typer.echo(json.dumps(bundle, indent=2))


if __name__ == "__main__":
    app()
