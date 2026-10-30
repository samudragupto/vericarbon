"""Train HistGradientBoostingRegressor on quantized features and export to ONNX."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import numpy as np
import onnx
import onnxruntime as ort
import pandas as pd
from onnx import TensorProto, helper
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error

from mrv.dataset import (
    DEFAULT_FIXTURES_DIR,
    FEATURE_NAMES,
    QUANTIZATION_PARAMS,
    build_dataset,
)
from mrv.fetch import SEED


def sha256_file_hex(path: Path) -> str:
    """Compute a 0x-prefixed SHA-256 hex digest of a file."""
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return f"0x{digest}"


def _export_hgb_to_onnx(
    reg: HistGradientBoostingRegressor,
    num_features: int,
) -> onnx.ModelProto:
    """Compile a fitted HistGradientBoostingRegressor into standard ONNX tensor ops.

    Translates every decision tree in ``reg._predictors`` into standard ONNX opset 15
    nodes (``Gather``, ``LessOrEqual``, ``Where``, ``Add``) so the exported graph runs
    identically in ``onnxruntime`` and compiles cleanly in ``ezkl`` Halo2 circuits.
    """
    nodes_proto: list[onnx.NodeProto] = []
    initializers: list[onnx.TensorProto] = []
    counter = 0

    def next_id(prefix: str) -> str:
        nonlocal counter
        counter += 1
        return f"{prefix}_{counter}"

    # Pre-slice each feature column X[:, j] once with shape (N, 1)
    feature_cols: dict[int, str] = {}
    for feat_idx in range(num_features):
        idx_name = next_id(f"feat_idx_{feat_idx}")
        initializers.append(
            helper.make_tensor(idx_name, TensorProto.INT64, [1], [int(feat_idx)])
        )
        col_out = next_id(f"feat_col_{feat_idx}")
        nodes_proto.append(
            helper.make_node(
                "Gather",
                inputs=["input", idx_name],
                outputs=[col_out],
                axis=1,
                name=next_id("Gather"),
            )
        )
        feature_cols[feat_idx] = col_out

    def build_tree_node(tree_nodes: np.ndarray, node_idx: int) -> str:
        node = tree_nodes[node_idx]
        if int(node["is_leaf"]) == 1:
            leaf_name = next_id("leaf_val")
            initializers.append(
                helper.make_tensor(
                    leaf_name,
                    TensorProto.FLOAT,
                    [1, 1],
                    [float(node["value"])],
                )
            )
            return leaf_name

        feat_idx = int(node["feature_idx"])
        threshold = float(node["num_threshold"])
        left_idx = int(node["left"])
        right_idx = int(node["right"])

        thresh_name = next_id("thresh")
        initializers.append(
            helper.make_tensor(
                thresh_name,
                TensorProto.FLOAT,
                [1, 1],
                [threshold],
            )
        )
        cond_out = next_id("cond")
        nodes_proto.append(
            helper.make_node(
                "LessOrEqual",
                inputs=[feature_cols[feat_idx], thresh_name],
                outputs=[cond_out],
                name=next_id("LessOrEqual"),
            )
        )
        left_out = build_tree_node(tree_nodes, left_idx)
        right_out = build_tree_node(tree_nodes, right_idx)
        where_out = next_id("where")
        nodes_proto.append(
            helper.make_node(
                "Where",
                inputs=[cond_out, left_out, right_out],
                outputs=[where_out],
                name=next_id("Where"),
            )
        )
        return where_out

    base_val = float(np.asarray(reg._baseline_prediction).ravel()[0])
    accum_name = next_id("baseline")
    initializers.append(
        helper.make_tensor(accum_name, TensorProto.FLOAT, [1, 1], [base_val])
    )

    for tree_iter in reg._predictors:
        tree_predictor = tree_iter[0]
        tree_out = build_tree_node(tree_predictor.nodes, 0)
        next_accum = next_id("accum")
        nodes_proto.append(
            helper.make_node(
                "Add",
                inputs=[accum_name, tree_out],
                outputs=[next_accum],
                name=next_id("Add"),
            )
        )
        accum_name = next_accum

    # Final identity/add to bind output name "variable" of shape (N, 1)
    zero_name = next_id("zero")
    initializers.append(helper.make_tensor(zero_name, TensorProto.FLOAT, [1, 1], [0.0]))
    nodes_proto.append(
        helper.make_node(
            "Add",
            inputs=[accum_name, zero_name],
            outputs=["variable"],
            name=next_id("OutputAdd"),
        )
    )

    input_info = helper.make_tensor_value_info(
        "input", TensorProto.FLOAT, [None, num_features]
    )
    output_info = helper.make_tensor_value_info(
        "variable", TensorProto.FLOAT, [None, 1]
    )
    graph = helper.make_graph(
        nodes_proto,
        "VeriCarbonAGBHistGBR",
        [input_info],
        [output_info],
        initializer=initializers,
    )
    model = helper.make_model(
        graph,
        producer_name="vericarbon-mrv",
        producer_version="0.1.0",
        opset_imports=[helper.make_opsetid("", 15)],
    )
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


def train_model(
    dataset_dir: Path = DEFAULT_FIXTURES_DIR,
    output_dir: Path | None = None,
    onnx_out_path: Path | None = None,
) -> dict[str, Any]:
    """Train HistGradientBoostingRegressor, evaluate holdout, and export ONNX."""
    if output_dir is None:
        output_dir = dataset_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    parquet_path = dataset_dir / "dataset.parquet"
    manifest_path = dataset_dir / "dataset_manifest.json"
    if not (parquet_path.exists() and manifest_path.exists()):
        build_dataset(fixtures_dir=dataset_dir, output_dir=dataset_dir, offline=True)

    df = pd.read_parquet(parquet_path)
    manifest: dict[str, Any] = json.loads(manifest_path.read_text(encoding="utf-8"))

    train_df = df[df["split"] == "train"]
    test_df = df[df["split"] == "test"]
    if train_df.empty or test_df.empty:
        raise ValueError("Train or spatial-block test split is empty.")

    x_train = train_df[FEATURE_NAMES].to_numpy(dtype=np.float32)
    y_train = train_df["agb_mg_ha"].to_numpy(dtype=np.float32)
    x_test = test_df[FEATURE_NAMES].to_numpy(dtype=np.float32)
    y_test = test_df["agb_mg_ha"].to_numpy(dtype=np.float32)

    hyperparams: dict[str, Any] = {
        "max_iter": 40,
        "max_depth": 4,
        "learning_rate": 0.1,
        "min_samples_leaf": 8,
        "random_state": SEED,
    }

    reg = HistGradientBoostingRegressor(**hyperparams)
    reg.fit(x_train, y_train)

    y_pred_test = reg.predict(x_test)
    mae = float(mean_absolute_error(y_test, y_pred_test))
    rmse = float(root_mean_squared_error(y_test, y_pred_test))
    r2 = float(r2_score(y_test, y_pred_test))

    onnx_model = _export_hgb_to_onnx(reg, num_features=len(FEATURE_NAMES))

    model_path = (
        onnx_out_path if onnx_out_path is not None else (output_dir / "model.onnx")
    )
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.write_bytes(onnx_model.SerializeToString())

    # Verify ONNX predictions match scikit-learn predictions on held-out spatial block
    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    ort_preds = session.run(None, {"input": x_test})[0].ravel()
    if not np.allclose(ort_preds, y_pred_test, atol=1e-3):
        raise RuntimeError("ONNX exported model predictions diverged from sklearn.")

    model_hash = sha256_file_hex(model_path)

    model_card: dict[str, Any] = {
        "model_name": "VeriCarbonAGBHistGBR",
        "model_version": "0.1.0",
        "model_hash": model_hash,
        "onnx_path": str(model_path),
        "metrics": {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
            "train_samples": int(len(train_df)),
            "test_samples": int(len(test_df)),
            "held_out_geohash5_blocks": manifest.get("test_geohash5_blocks", []),
        },
        "feature_list": FEATURE_NAMES,
        "scale_params": QUANTIZATION_PARAMS,
        "hyperparameters": hyperparams,
        "seed": SEED,
    }

    card_path = model_path.parent / "model_card.json"
    card_path.write_text(json.dumps(model_card, indent=2) + "\n", encoding="utf-8")
    return model_card
