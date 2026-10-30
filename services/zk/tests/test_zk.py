"""Test suite for VeriCarbon ZK (ezkl) CLI and circuit verification."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from vericarbon_zk.cli import app
from vericarbon_zk.workspace import (
    DEFAULT_ARTIFACTS_DIR,
    DEFAULT_MRV_FIXTURES_DIR,
    prove_bundle,
    verify_proof_file,
)

runner = CliRunner()


def test_committed_zk_artifacts_verify() -> None:
    """Verify the committed proof.json in services/zk/artifacts against vk.key."""
    proof_path = DEFAULT_ARTIFACTS_DIR / "proof.json"
    assert proof_path.exists()
    res = runner.invoke(
        app,
        [
            "verify",
            "--proof",
            str(proof_path),
            "--artifacts-dir",
            str(DEFAULT_ARTIFACTS_DIR),
        ],
    )
    assert res.exit_code == 0, res.stdout
    payload = json.loads(res.stdout)
    assert payload["verified"] is True


def test_zk_prove_and_verify_cli(tmp_path: Path) -> None:
    """Verify `zk prove --bundle ... --out ...` and `zk verify --proof ...` via CLI."""
    out_proof = tmp_path / "cli_proof.json"
    bundle_path = DEFAULT_MRV_FIXTURES_DIR / "evidence_bundle.json"

    prove_res = runner.invoke(
        app,
        [
            "prove",
            "--bundle",
            str(bundle_path),
            "--out",
            str(out_proof),
            "--artifacts-dir",
            str(DEFAULT_ARTIFACTS_DIR),
        ],
    )
    assert prove_res.exit_code == 0, prove_res.stdout
    assert out_proof.exists()

    verify_res = runner.invoke(
        app,
        [
            "verify",
            "--proof",
            str(out_proof),
            "--artifacts-dir",
            str(DEFAULT_ARTIFACTS_DIR),
        ],
    )
    assert verify_res.exit_code == 0, verify_res.stdout
    assert json.loads(verify_res.stdout)["verified"] is True


def test_overclaiming_rejected_by_circuit(tmp_path: Path) -> None:
    """Verify that claiming more credits than model(quantizedFeatures) is rejected."""
    bundle_path = DEFAULT_MRV_FIXTURES_DIR / "evidence_bundle.json"
    out_proof = tmp_path / "invalid_proof.json"

    with pytest.raises(ValueError, match="Over-claiming rejected by circuit"):
        prove_bundle(
            bundle_path=bundle_path,
            proof_out_path=out_proof,
            artifacts_dir=DEFAULT_ARTIFACTS_DIR,
            claimed_amount_override=95000.0,
        )


def test_tampered_proof_rejected(tmp_path: Path) -> None:
    """Verify tampering with the public claimedAmount instance fails verification."""
    proof_src = DEFAULT_ARTIFACTS_DIR / "proof.json"
    proof_data = json.loads(proof_src.read_text(encoding="utf-8"))

    # Tamper with instances[0][2] (claimedAmount little-endian felt)
    proof_data["instances"][0][
        2
    ] = "2102000000000000000000000000000000000000000000000000000000000000"
    tampered_path = tmp_path / "tampered_proof.json"
    tampered_path.write_text(json.dumps(proof_data), encoding="utf-8")

    assert (
        verify_proof_file(tampered_path, artifacts_dir=DEFAULT_ARTIFACTS_DIR) is False
    )
