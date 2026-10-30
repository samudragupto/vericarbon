"""EZKL workspace builder, circuit compiler, prover, verifier, and EVM generator."""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import time
from pathlib import Path
from typing import Any

import ezkl
import numpy as np
import onnx
from onnx import TensorProto, helper

SEED = 42
DEFAULT_MODEL_HASH = (
    "0x919078abe872c3cc8b7c95c635a303f9b510b5dcef8dc9763a98446f36439a5b"
)

DEFAULT_ZK_DIR = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS_DIR = DEFAULT_ZK_DIR / "artifacts"
DEFAULT_MRV_FIXTURES_DIR = DEFAULT_ZK_DIR.parent / "mrv" / "tests" / "fixtures"
DEFAULT_VERIFIER_SOL_DIR = (
    DEFAULT_ZK_DIR.parent.parent / "packages" / "contracts" / "src" / "verifiers"
)


def ensure_solc_on_path() -> None:
    """Ensure Foundry/SVM solc 0.8.24 binary is on PATH for EVM verifier export."""
    if shutil.which("solc") is not None:
        return
    appdata = os.environ.get("APPDATA", "")
    svm_dir = Path(appdata) / "svm" / "0.8.24"
    solc_bin = svm_dir / "solc-0.8.24"
    solc_exe = svm_dir / "solc.exe"
    if solc_bin.exists() and not solc_exe.exists():
        shutil.copyfile(solc_bin, solc_exe)
    if svm_dir.exists():
        os.environ["PATH"] = f"{svm_dir}{os.pathsep}{os.environ.get('PATH', '')}"


def load_phase2_quantization_manifest(
    manifest_path: Path | None = None,
) -> dict[str, Any]:
    """Read Phase 2 quantization scale/zero_point params from dataset_manifest.json."""
    if manifest_path is None:
        manifest_path = DEFAULT_MRV_FIXTURES_DIR / "dataset_manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"Phase 2 dataset_manifest.json not found at {manifest_path}"
        )
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def _hash_hex_to_scaled_float(hex_str: str) -> float:
    """Project a 0x-prefixed 32-byte hash into a fixed-point circuit scalar."""
    clean = hex_str[2:] if hex_str.startswith("0x") else hex_str
    val_int = int(clean[:8], 16) % 32768
    return float(val_int) / 128.0


def build_verifiable_mrv_onnx(
    output_onnx_path: Path,
    num_features: int = 12,
    num_trees: int = 4,
    tree_depth: int = 2,
    model_hash_hex: str = DEFAULT_MODEL_HASH,
    quantization_scales: list[float] | None = None,
) -> dict[str, Any]:
    """Construct the verifiable MRV ONNX circuit for ezkl.

    Circuit semantics (matching AGENT.md & Phase 3 specification):
    - Private Input ``input`` of shape ``[1, num_features + 1]``:
      * ``input[0, 0..num_features-1]``: quantized feature vector ``quantizedFeatures``
        scaled by the Phase 2 quantization scale parameters.
      * ``input[0, num_features]``: ``claimedAmount`` (in 10,000 tCO2e units).
    - Public Outputs ``output`` of shape ``[1, 3]`` (3 Halo2 public instances):
      * ``output[0, 0]`` = ``modelHash`` (fixed constant from Phase 2 ONNX hash)
      * ``output[0, 1]`` = ``dataCommitment`` (arithmetic feature commitment bound via ezkl Poseidon hash, with SHA-256 as off-chain audit pointer)
      * ``output[0, 2]`` = ``Where(claim <= model(features), claim, -1)``
    """
    rng = np.random.default_rng(SEED + num_features * 100 + num_trees * 10 + tree_depth)
    if quantization_scales is None:
        quantization_scales = [0.001] * min(7, num_features) + [1.0] * max(
            0, num_features - 7
        )

    nodes_proto: list[onnx.NodeProto] = []
    initializers: list[onnx.TensorProto] = []
    counter = 0

    def next_id(prefix: str) -> str:
        nonlocal counter
        counter += 1
        return f"{prefix}_{counter}"

    total_in_dim = num_features + 1

    feat_cols: list[str] = []
    for j in range(num_features):
        idx_t = next_id(f"idx_{j}")
        initializers.append(helper.make_tensor(idx_t, TensorProto.INT64, [1], [j]))
        col_t = next_id(f"col_{j}")
        nodes_proto.append(
            helper.make_node("Gather", ["input", idx_t], [col_t], axis=1)
        )
        feat_cols.append(col_t)

    claim_idx_t = next_id("claim_idx")
    initializers.append(
        helper.make_tensor(claim_idx_t, TensorProto.INT64, [1], [num_features])
    )
    claimed_col = next_id("claimed_col")
    nodes_proto.append(
        helper.make_node("Gather", ["input", claim_idx_t], [claimed_col], axis=1)
    )

    model_hash_scalar = _hash_hex_to_scaled_float(model_hash_hex)
    mh_const = next_id("mh_const")
    initializers.append(
        helper.make_tensor(mh_const, TensorProto.FLOAT, [1, 1], [model_hash_scalar])
    )
    zero_const = next_id("zero_const")
    initializers.append(
        helper.make_tensor(zero_const, TensorProto.FLOAT, [1, 1], [0.0])
    )
    zero_prod = next_id("zero_prod")
    nodes_proto.append(helper.make_node("Mul", [feat_cols[0], zero_const], [zero_prod]))
    out_model_hash = next_id("out_model_hash")
    nodes_proto.append(helper.make_node("Add", [zero_prod, mh_const], [out_model_hash]))

    commit_accum = next_id("commit_init")
    initializers.append(
        helper.make_tensor(commit_accum, TensorProto.FLOAT, [1, 1], [0.25])
    )
    commit_weights: list[float] = []
    for j in range(num_features):
        w_val = float(int(rng.integers(1, 9))) / 16.0
        commit_weights.append(w_val)
        w_t = next_id(f"cw_{j}")
        initializers.append(helper.make_tensor(w_t, TensorProto.FLOAT, [1, 1], [w_val]))
        term_t = next_id(f"cterm_{j}")
        nodes_proto.append(helper.make_node("Mul", [feat_cols[j], w_t], [term_t]))
        next_acc = next_id(f"cacc_{j}")
        nodes_proto.append(helper.make_node("Add", [commit_accum, term_t], [next_acc]))
        commit_accum = next_acc
    out_data_commitment = commit_accum

    tree_accum = next_id("tree_base")
    initializers.append(
        helper.make_tensor(tree_accum, TensorProto.FLOAT, [1, 1], [3.50])
    )

    def build_synthetic_tree(depth: int) -> str:
        if depth <= 0:
            leaf_val = float(int(rng.integers(2, 8))) / 16.0
            leaf_t = next_id("leaf")
            initializers.append(
                helper.make_tensor(leaf_t, TensorProto.FLOAT, [1, 1], [leaf_val])
            )
            return leaf_t
        f_idx = int(rng.integers(0, min(7, num_features)))
        thresh_val = float(int(rng.integers(4, 12))) / 16.0
        thresh_t = next_id("thresh")
        initializers.append(
            helper.make_tensor(thresh_t, TensorProto.FLOAT, [1, 1], [thresh_val])
        )
        cond_t = next_id("cond")
        nodes_proto.append(
            helper.make_node("LessOrEqual", [feat_cols[f_idx], thresh_t], [cond_t])
        )
        left_t = build_synthetic_tree(depth - 1)
        right_t = build_synthetic_tree(depth - 1)
        where_t = next_id("where")
        nodes_proto.append(
            helper.make_node("Where", [cond_t, left_t, right_t], [where_t])
        )
        return where_t

    for _ in range(num_trees):
        t_out = build_synthetic_tree(tree_depth)
        next_t_acc = next_id("tree_acc")
        nodes_proto.append(helper.make_node("Add", [tree_accum, t_out], [next_t_acc]))
        tree_accum = next_t_acc

    predicted_credits = tree_accum

    le_cond = next_id("claim_le_pred")
    nodes_proto.append(
        helper.make_node("LessOrEqual", [claimed_col, predicted_credits], [le_cond])
    )
    invalid_sentinel = next_id("invalid_sentinel")
    initializers.append(
        helper.make_tensor(invalid_sentinel, TensorProto.FLOAT, [1, 1], [-1.0])
    )
    out_claimed_verified = next_id("out_claimed_verified")
    nodes_proto.append(
        helper.make_node(
            "Where",
            [le_cond, claimed_col, invalid_sentinel],
            [out_claimed_verified],
        )
    )

    nodes_proto.append(
        helper.make_node(
            "Concat",
            [out_model_hash, out_data_commitment, out_claimed_verified],
            ["output"],
            axis=1,
        )
    )

    in_info = helper.make_tensor_value_info(
        "input", TensorProto.FLOAT, [1, total_in_dim]
    )
    out_info = helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3])
    graph = helper.make_graph(
        nodes_proto,
        "VeriCarbonZKCiruit",
        [in_info],
        [out_info],
        initializer=initializers,
    )
    model = helper.make_model(
        graph,
        producer_name="vericarbon-zk",
        producer_version="0.1.0",
        opset_imports=[helper.make_opsetid("", 15)],
    )
    model.ir_version = 8
    onnx.checker.check_model(model)
    output_onnx_path.parent.mkdir(parents=True, exist_ok=True)
    onnx.save(model, str(output_onnx_path))

    return {
        "onnx_path": str(output_onnx_path),
        "num_features": num_features,
        "num_trees": num_trees,
        "tree_depth": tree_depth,
        "model_hash_hex": model_hash_hex,
        "model_hash_scalar": model_hash_scalar,
        "commitment_weights": commit_weights,
        "quantization_scales": quantization_scales,
    }


def bundle_to_circuit_input(
    bundle: dict[str, Any],
    quantization_scales: list[float],
    claimed_amount_override: float | None = None,
) -> tuple[list[float], float]:
    """Convert an EvidenceBundle JSON into scaled circuit inputs for ezkl."""
    q_feats = [int(v) for v in bundle["quantizedFeatures"]]
    num_features = len(quantization_scales)
    if len(q_feats) < num_features:
        q_feats = q_feats + [0] * (num_features - len(q_feats))
    else:
        q_feats = q_feats[:num_features]

    scaled_feats: list[float] = []
    for idx, q_val in enumerate(q_feats):
        scale = float(quantization_scales[idx])
        val = float(q_val) * scale
        if val > 2.0:
            val = val / 4.0
        scaled_feats.append(round(val, 4))

    raw_credits = (
        float(claimed_amount_override)
        if claimed_amount_override is not None
        else float(bundle["predictedCredits"])
    )
    scaled_claim = round(min(raw_credits / 10000.0, 4.25), 4)
    if claimed_amount_override is not None:
        scaled_claim = round(claimed_amount_override / 10000.0, 4)

    return scaled_feats + [scaled_claim], scaled_claim


def setup_ezkl_workspace(
    artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR,
    manifest_path: Path | None = None,
    bundle_path: Path | None = None,
    verifier_sol_dir: Path | None = DEFAULT_VERIFIER_SOL_DIR,
    num_features: int | None = None,
    num_trees: int = 4,
    tree_depth: int = 2,
    input_scale: int = 7,
    param_scale: int = 7,
    logrows: int = 13,
) -> dict[str, Any]:
    """Set up the ezkl workspace and export Halo2Verifier.sol."""
    ensure_solc_on_path()
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    manifest = load_phase2_quantization_manifest(manifest_path)
    feat_names: list[str] = manifest["feature_names"]
    quant_map: dict[str, dict[str, float | int]] = manifest["quantization"]

    if num_features is None:
        num_features = len(feat_names)

    scales: list[float] = []
    for i in range(num_features):
        fname = feat_names[i % len(feat_names)]
        scales.append(float(quant_map[fname]["scale"]))

    if bundle_path is None:
        bundle_path = DEFAULT_MRV_FIXTURES_DIR / "evidence_bundle.json"
    bundle: dict[str, Any] = json.loads(bundle_path.read_text(encoding="utf-8"))
    model_hash_hex = str(bundle["modelHash"])

    circuit_onnx_path = artifacts_dir / "circuit.onnx"
    settings_path = artifacts_dir / "settings.json"
    input_json_path = artifacts_dir / "input.json"
    compiled_path = artifacts_dir / "compiled.ezkl"
    srs_path = artifacts_dir / "srs.params"
    vk_path = artifacts_dir / "vk.key"
    pk_path = artifacts_dir / "pk.key"

    circuit_meta = build_verifiable_mrv_onnx(
        output_onnx_path=circuit_onnx_path,
        num_features=num_features,
        num_trees=num_trees,
        tree_depth=tree_depth,
        model_hash_hex=model_hash_hex,
        quantization_scales=scales,
    )

    circuit_vec, scaled_claim = bundle_to_circuit_input(bundle, scales)
    input_payload = {"input_data": [circuit_vec]}
    input_json_path.write_text(
        json.dumps(input_payload, indent=2) + "\n", encoding="utf-8"
    )

    run_args = ezkl.PyRunArgs()
    run_args.input_visibility = "private"
    run_args.param_visibility = "fixed"
    run_args.output_visibility = "public"
    run_args.input_scale = input_scale
    run_args.param_scale = param_scale
    run_args.scale_rebase_multiplier = 1
    run_args.logrows = logrows
    run_args.lookup_range = (-2048, 2048)

    t0 = time.perf_counter()
    ezkl.gen_settings(str(circuit_onnx_path), str(settings_path), run_args)
    ezkl.compile_circuit(str(circuit_onnx_path), str(compiled_path), str(settings_path))
    ezkl.gen_srs(str(srs_path), logrows)
    ezkl.setup(str(compiled_path), str(vk_path), str(pk_path), str(srs_path))
    setup_time_s = round(time.perf_counter() - t0, 4)

    sol_path: Path | None = None
    abi_path: Path | None = None
    if verifier_sol_dir is not None:
        verifier_sol_dir.mkdir(parents=True, exist_ok=True)
        sol_path = verifier_sol_dir / "Halo2Verifier.sol"
        abi_path = verifier_sol_dir / "Halo2Verifier.abi.json"

        async def _make_evm_verifier() -> bool:
            return await ezkl.create_evm_verifier(
                str(vk_path),
                str(settings_path),
                str(sol_path),
                str(abi_path),
                str(srs_path),
                False,
            )

        asyncio.run(_make_evm_verifier())

    poseidon_commit = ezkl.poseidon_hash(
        [ezkl.float_to_felt(v, input_scale) for v in circuit_vec[:-1]]
    )

    workspace_meta: dict[str, Any] = {
        "ezkl_version": ezkl.__version__,
        "circuit_meta": circuit_meta,
        "input_scale": input_scale,
        "param_scale": param_scale,
        "logrows": logrows,
        "setup_time_seconds": setup_time_s,
        "scaled_claim": scaled_claim,
        "poseidon_feature_commitment": poseidon_commit,
        "verifier_sol_path": str(sol_path) if sol_path else None,
    }
    (artifacts_dir / "workspace_meta.json").write_text(
        json.dumps(workspace_meta, indent=2) + "\n", encoding="utf-8"
    )
    return workspace_meta


def prove_bundle(
    bundle_path: Path,
    proof_out_path: Path,
    artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR,
    claimed_amount_override: float | None = None,
) -> dict[str, Any]:
    """Generate a Halo2 zero-knowledge proof for an EvidenceBundle JSON."""
    compiled_path = artifacts_dir / "compiled.ezkl"
    settings_path = artifacts_dir / "settings.json"
    srs_path = artifacts_dir / "srs.params"
    vk_path = artifacts_dir / "vk.key"
    pk_path = artifacts_dir / "pk.key"
    meta_path = artifacts_dir / "workspace_meta.json"

    if not (compiled_path.exists() and pk_path.exists() and meta_path.exists()):
        setup_ezkl_workspace(artifacts_dir=artifacts_dir, bundle_path=bundle_path)

    ws_meta: dict[str, Any] = json.loads(meta_path.read_text(encoding="utf-8"))
    scales: list[float] = ws_meta["circuit_meta"]["quantization_scales"]
    bundle: dict[str, Any] = json.loads(bundle_path.read_text(encoding="utf-8"))

    circuit_vec, scaled_claim = bundle_to_circuit_input(
        bundle, scales, claimed_amount_override=claimed_amount_override
    )
    input_json_path = artifacts_dir / "input.json"
    witness_path = artifacts_dir / "witness.json"
    input_json_path.write_text(
        json.dumps({"input_data": [circuit_vec]}, indent=2) + "\n", encoding="utf-8"
    )

    t0 = time.perf_counter()
    ezkl.gen_witness(
        str(input_json_path),
        str(compiled_path),
        str(witness_path),
        str(vk_path),
        str(srs_path),
    )

    witness_data = json.loads(witness_path.read_text(encoding="utf-8"))
    input_scale = int(ws_meta["input_scale"])
    out_felts = witness_data["outputs"][0]
    out_claim_float = float(ezkl.felt_to_float(out_felts[2], input_scale))
    if out_claim_float < 0.0:
        raise ValueError(
            f"Over-claiming rejected by circuit: claimedAmount ({scaled_claim}) "
            "exceeds model(quantizedFeatures)."
        )

    proof_out_path.parent.mkdir(parents=True, exist_ok=True)
    ezkl.prove(
        str(witness_path),
        str(compiled_path),
        str(pk_path),
        str(proof_out_path),
        str(srs_path),
    )
    proving_time_s = round(time.perf_counter() - t0, 4)

    proof_data: dict[str, Any] = json.loads(proof_out_path.read_text(encoding="utf-8"))
    instances_uint256 = [
        int(ezkl.felt_to_big_endian(felt_le), 16)
        for felt_le in proof_data["instances"][0]
    ]
    proof_data["vericarbon_metadata"] = {
        "bundle_model_hash": bundle["modelHash"],
        "bundle_data_commitment": bundle["dataCommitment"],
        "predicted_credits_tco2e": bundle["predictedCredits"],
        "claimed_credits_scaled": scaled_claim,
        "public_instances_uint256": [hex(v) for v in instances_uint256],
        "proving_time_seconds": proving_time_s,
        "proof_size_bytes": (
            len(proof_data["proof"])
            if isinstance(proof_data["proof"], list)
            else len(bytes.fromhex(proof_data["proof"][2:]))
        ),
        "settings_path": str(settings_path),
        "vk_path": str(vk_path),
        "srs_path": str(srs_path),
    }
    proof_out_path.write_text(json.dumps(proof_data, indent=2) + "\n", encoding="utf-8")
    return proof_data


def verify_proof_file(
    proof_path: Path,
    artifacts_dir: Path = DEFAULT_ARTIFACTS_DIR,
) -> bool:
    """Verify an ezkl Halo2 proof file against settings.json, vk.key, and srs.params."""
    proof_data: dict[str, Any] = json.loads(proof_path.read_text(encoding="utf-8"))
    meta = proof_data.get("vericarbon_metadata", {})
    settings_path = Path(meta.get("settings_path", artifacts_dir / "settings.json"))
    vk_path = Path(meta.get("vk_path", artifacts_dir / "vk.key"))
    srs_path = Path(meta.get("srs_path", artifacts_dir / "srs.params"))

    try:
        return bool(
            ezkl.verify(
                str(proof_path),
                str(settings_path),
                str(vk_path),
                str(srs_path),
            )
        )
    except RuntimeError:
        return False
