#!/usr/bin/env python3
"""
Audit numerical claims in Section 6 (paper/sections/06_evaluation.md) against canonical evaluation JSONs.
Ensures zero drift between prose and benchmark result artifacts.
"""
import json
import re
import sys
from pathlib import Path

def main():
    repo_root = Path(__file__).resolve().parent.parent
    sec6_path = repo_root / "paper" / "sections" / "06_evaluation.md"
    results_dir = repo_root / "eval" / "results"

    if not sec6_path.exists():
        print(f"FAIL: {sec6_path} not found")
        sys.exit(1)

    prose = sec6_path.read_text(encoding="utf-8")

    # Load canonical artifacts
    with open(results_dir / "zk_benchmarks.json", "r", encoding="utf-8") as f:
        zk_data = json.load(f)
    with open(results_dir / "gas_costs.json", "r", encoding="utf-8") as f:
        gas_data = json.load(f)
    with open(results_dir / "latency.json", "r", encoding="utf-8") as f:
        lat_data = json.load(f)
    with open(results_dir / "model_metrics.json", "r", encoding="utf-8") as f:
        model_data = json.load(f)

    failures = []

    # 1. ZK Benchmarks assertions
    # Canonical F=12, T=4
    canonical_zk = None
    f32_zk = None
    for r in zk_data.get("results", []):
        if r.get("num_features") == 12 and r.get("num_trees") == 4:
            canonical_zk = r
        if r.get("num_features") == 32 and r.get("num_trees") == 8:
            f32_zk = r

    if not canonical_zk:
        failures.append("Canonical zk config (F=12, T=4) missing from zk_benchmarks.json")
    else:
        # Check proving time and setup time
        setup_str = f"{canonical_zk['setup_time_s']} s"
        prove_str = f"{canonical_zk['proving_time_s']} s"
        if setup_str not in prose:
            failures.append(f"Expected setup time '{setup_str}' not found in §6 prose")
        if prove_str not in prose:
            failures.append(f"Expected proving time '{prove_str}' not found in §6 prose")

    if not f32_zk:
        failures.append("ZK config (F=32, T=8) missing from zk_benchmarks.json")
    else:
        f32_prove_str = f"{f32_zk['proving_time_s']} s"
        if f32_prove_str not in prose:
            failures.append(f"Expected F=32 proving time '{f32_prove_str}' not found in §6 prose")

    # Proof size
    if "4,032 bytes" not in prose:
        failures.append("Proof size '4,032 bytes' not found in §6 prose")

    # Off-chain verify time range
    verify_times = [r["verify_time_ms"] for r in zk_data.get("results", [])]
    min_v = f"{min(verify_times):.2f} ms"
    max_v = f"{max(verify_times):.2f} ms"
    if min_v not in prose or max_v not in prose:
        failures.append(f"Expected verify range '{min_v}' to '{max_v}' not found in §6 prose")

    # 2. Gas costs assertions
    ops = {op["function"]: op for op in gas_data["operations"] if op["contract"] == "CarbonRegistry"}
    
    # issue
    issue_gas_str = f"{ops['issue']['gas']:,}"
    if issue_gas_str not in prose:
        failures.append(f"Expected issue gas '{issue_gas_str}' not found in §6 prose")
    issue_l2_usd = f"${ops['issue']['cost_base_usd']:.4f}"
    if issue_l2_usd not in prose:
        failures.append(f"Expected issue L2 USD '{issue_l2_usd}' not found in §6 prose")
    issue_l1_usd = f"${ops['issue']['cost_l1_usd']:.2f}"
    if issue_l1_usd not in prose:
        failures.append(f"Expected issue L1 USD '{issue_l1_usd}' not found in §6 prose")

    # registerProject
    reg_gas_str = f"{ops['registerProject']['gas']:,}"
    if reg_gas_str not in prose:
        failures.append(f"Expected registerProject gas '{reg_gas_str}' not found in §6 prose")

    # retire
    retire_gas_str = f"{ops['retire']['gas']:,}"
    if retire_gas_str not in prose:
        failures.append(f"Expected retire gas '{retire_gas_str}' not found in §6 prose")

    # retireAmounts
    retire_amounts_gas_str = f"{ops['retireAmounts']['gas']:,}"
    if retire_amounts_gas_str not in prose:
        failures.append(f"Expected retireAmounts gas '{retire_amounts_gas_str}' not found in §6 prose")

    # verifyProof
    vproof = [op for op in gas_data["operations"] if op["contract"] == "Halo2Verifier" and op["function"] == "verifyProof"][0]
    vproof_gas_str = f"{vproof['gas']:,}"
    if vproof_gas_str not in prose:
        failures.append(f"Expected verifyProof gas '{vproof_gas_str}' not found in §6 prose")

    # 3. Latency assertions
    rpc = lat_data["rpc_roundtrip"]
    rpc_mean = f"{rpc['mean_ms']:.2f} ms"
    rpc_p95 = f"{rpc['p95_ms']:.2f} ms"
    if rpc_mean not in prose:
        failures.append(f"Expected RPC mean '{rpc_mean}' not found in §6 prose")
    if rpc_p95 not in prose:
        failures.append(f"Expected RPC p95 '{rpc_p95}' not found in §6 prose")

    idx = lat_data["indexer_lag"]
    idx_mean = f"{idx['mean_ms']:.2f} ms"
    idx_p95 = f"{idx['p95_ms']:.2f} ms"
    if idx_mean not in prose:
        failures.append(f"Expected indexer lag mean '{idx_mean}' not found in §6 prose")
    if idx_p95 not in prose:
        failures.append(f"Expected indexer lag p95 '{idx_p95}' not found in §6 prose")

    # 4. Check for forbidden setEvidence
    if "setEvidence" in prose:
        failures.append("Found forbidden 'setEvidence' in §6 prose")

    if failures:
        print(f"FAILED: {len(failures)} discrepancy/ies found in Section 6 prose:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)

    print("PASS: Section 6 prose numerical values perfectly match canonical JSON artifacts! (0 failures)")
    sys.exit(0)

if __name__ == "__main__":
    main()

