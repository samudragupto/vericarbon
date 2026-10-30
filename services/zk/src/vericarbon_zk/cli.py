"""Command-line interface for the VeriCarbon ZK pipeline (ezkl)."""

from __future__ import annotations

import json
from pathlib import Path

import typer

from vericarbon_zk.workspace import (
    DEFAULT_ARTIFACTS_DIR,
    DEFAULT_MRV_FIXTURES_DIR,
    DEFAULT_VERIFIER_SOL_DIR,
    prove_bundle,
    setup_ezkl_workspace,
    verify_proof_file,
)

app = typer.Typer(
    name="zk",
    help="VeriCarbon ZK CLI: setup -> prove -> verify.",
    add_completion=False,
)


@app.callback()
def main() -> None:
    """VeriCarbon ZK CLI entrypoint."""


@app.command("setup")
def setup_cmd(
    artifacts_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_ARTIFACTS_DIR,
        "--artifacts-dir",
        help="Directory to store ezkl circuit, settings, keys, and SRS.",
    ),
    verifier_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_VERIFIER_SOL_DIR,
        "--verifier-dir",
        help="Solidity verifier output directory inside packages/contracts.",
    ),
) -> None:
    """Initialize ezkl workspace and export Halo2Verifier.sol to packages/contracts."""
    meta = setup_ezkl_workspace(
        artifacts_dir=artifacts_dir,
        verifier_sol_dir=verifier_dir,
    )
    typer.echo(json.dumps(meta, indent=2))


@app.command("prove")
def prove_cmd(
    bundle: Path = typer.Option(  # noqa: B008
        DEFAULT_MRV_FIXTURES_DIR / "evidence_bundle.json",
        "--bundle",
        help="Path to the EvidenceBundle JSON file.",
    ),
    out: Path = typer.Option(  # noqa: B008
        DEFAULT_ARTIFACTS_DIR / "proof.json",
        "--out",
        help="Output path for the generated Halo2 proof JSON.",
    ),
    artifacts_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_ARTIFACTS_DIR,
        "--artifacts-dir",
        help="Directory containing compiled ezkl artifacts.",
    ),
    claimed_amount: float | None = typer.Option(
        None,
        "--claimed-amount",
        help="Optional override for claimedAmount (in tCO2e).",
    ),
) -> None:
    """Generate a zero-knowledge Halo2 proof from an EvidenceBundle JSON."""
    proof_data = prove_bundle(
        bundle_path=bundle,
        proof_out_path=out,
        artifacts_dir=artifacts_dir,
        claimed_amount_override=claimed_amount,
    )
    typer.echo(
        json.dumps(
            {
                "status": "ok",
                "proof_path": str(out),
                "metadata": proof_data["vericarbon_metadata"],
            },
            indent=2,
        )
    )


@app.command("verify")
def verify_cmd(
    proof: Path = typer.Option(  # noqa: B008
        DEFAULT_ARTIFACTS_DIR / "proof.json",
        "--proof",
        help="Path to the Halo2 proof JSON file to verify.",
    ),
    artifacts_dir: Path = typer.Option(  # noqa: B008
        DEFAULT_ARTIFACTS_DIR,
        "--artifacts-dir",
        help="Directory containing settings.json, vk.key, and srs.params.",
    ),
) -> None:
    """Verify a Halo2 proof JSON file using ezkl."""
    verified = verify_proof_file(proof_path=proof, artifacts_dir=artifacts_dir)
    if not verified:
        typer.echo(json.dumps({"verified": False, "proof": str(proof)}, indent=2))
        raise typer.Exit(code=1)
    typer.echo(json.dumps({"verified": True, "proof": str(proof)}, indent=2))


if __name__ == "__main__":
    app()
