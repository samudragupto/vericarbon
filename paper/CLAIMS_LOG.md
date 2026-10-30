# CLAIMS_LOG.md — Manuscript Claims Registry

| Claim ID | Section(s) | Prose Claim | Artifact Path / JSON Pointer | Canonical Value | Status in Manuscript |
| :--- | :--- | :--- | :--- | :--- | :--- |
| C-01 | §6.1, §7.3 | Model canonical holdout (6z900) MAE (Mg/ha) | `eval/results/model_metrics.json` -> `/canonical_holdout/mae` | 3.7514 | Incorporated in §6.1, §7.3 |
| C-02 | §6.1 | Model canonical holdout (6z900) RMSE (Mg/ha) | `eval/results/model_metrics.json` -> `/canonical_holdout/rmse` | 8.1675 | Incorporated in §6.1 |
| C-03 | §6.1, Table 2 | Model canonical holdout (6z900) R² score | `eval/results/model_metrics.json` -> `/canonical_holdout/r2` | 0.9869 | Contained to §6.1 and Table 2 (P-A3) |
| C-04 | §0, §1.4, §1.5, §6.2, §8.1 | Laptop CPU proving time for canonical circuit (F=12, T=4, D=2) | `eval/results/zk_benchmarks.json` -> `/results/3/proving_time_s` | 0.5634 s | Incorporated in §0, §1, §6.2, §8.1 |
| C-05 | §6.2 | Circuit setup and key generation time | `eval/results/zk_benchmarks.json` -> `/results/3/setup_time_s` | 0.7503 s | Incorporated in §6.2 |
| C-06 | §0, §4.7, §6.2 | Halo2 SNARK proof size in bytes | `eval/results/zk_benchmarks.json` -> `/results/3/proof_size_bytes` | 4,032 bytes | Incorporated in §0, §4.7, §6.2 |
| C-07 | §4.8, §5.2, §6.2 | Halo2Verifier.sol compiled initcode size in bytes | `eval/results/manifest.json` -> `/contract_sizes/Halo2Verifier/initcode` | 18,007 bytes | Incorporated in §4.8, §5.2, §6.2 |
| C-08 | §0, §1.4, §4.8, §6.2, §6.4 | Halo2Verifier.verifyProof EVM verification gas | `eval/results/zk_benchmarks.json` -> `/results/3/verification_gas` | 643,269 gas | Incorporated in §0, §1, §4.8, §6.2, §6.4 |
| C-09 | §0, §1.5, §6.4, §8.1 | CarbonRegistry.issue measured execution gas | `eval/results/gas_costs.json` -> `/operations/1/gas` | 873,164 gas | Incorporated in §0, §1, §6.4, §8.1 |
| C-10 | §0, §1.5, §6.4, §7.4, §8.1 | Modeled issuance transaction cost on Base L2 in USD | `eval/results/gas_costs.json` -> `/operations/1/cost_base_usd` | $0.0119 | Incorporated in §0, §1, §6.4, §7.4, §8.1 |
| C-11 | §6.4, §7.4 | Modeled issuance transaction cost on Ethereum L1 in USD | `eval/results/gas_costs.json` -> `/operations/1/cost_l1_usd` | $54.57 | Incorporated in §6.4, §7.4 |
| C-12 | §6.4 | Base Sepolia public RPC eth_blockNumber roundtrip p95 | `eval/results/latency.json` -> `/rpc_roundtrip/p95_ms` | 541.66 ms | Incorporated in §6.4 |
| C-13 | §6.4 | Off-chain indexer visibility lag p95 | `eval/results/latency.json` -> `/indexer_lag/p95_ms` | 28.53 ms | Incorporated in §6.4 |
| C-14 | §5.3 | Lighthouse performance score on web landing page | `eval/results/lighthouse_report.json` -> `/performanceScore` | 95 | Incorporated in §5.3 |
| C-15 | §0, §1.5, §2.4, §6.3, §8.1 | Total security fraud scenarios evaluated (7 attacks + 2 pre-A0 holes) | `eval/results/fraud_results.json` -> `/total_attacks_evaluated` | 9 | Incorporated in §0, §1, §2.4, §6.3, §8.1 |
| C-16 | §0, §1.2, §2.2, §4.4, §6.3 | Duplicate credits minted on BaselineCentralRegistry | `eval/results/baseline_double_issuance_receipt.json` -> `/total_double_issued_credits` | 1,088 | Incorporated in §0, §1, §2.2, §4.4, §6.3 |
| C-17 | §6.1 | 4-fold spatial-block CV average MAE (Mg/ha) | `eval/results/model_metrics.json` -> `/aggregate/mae_mean` | 5.2901 | Incorporated in §6.1 |
| C-18 | §6.1 | 4-fold spatial-block CV average RMSE (Mg/ha) | `eval/results/model_metrics.json` -> `/aggregate/rmse_mean` | 11.6196 | Incorporated in §6.1 |
| C-19 | §6.1 | 4-fold spatial-block CV average R² score | `eval/results/model_metrics.json` -> `/aggregate/r2_mean` | 0.8812 | Incorporated in §6.1 |
| C-20 | §4.8, §5.2 | CarbonRegistry runtime bytecode size in bytes | `eval/results/manifest.json` -> `/contract_sizes/CarbonRegistry/runtime` | 11,323 bytes | Incorporated in §4.8, §5.2 |

## Hardware Discrepancy & Canonicalization Log (STEP 0.2 / P-A5)

| Specification | Old Manifest / Prose String | Captured Value (`eval/results/machine_specs.json`) | Status / Action Taken |
| :--- | :--- | :--- | :--- |
| **System Model** | "commodity laptop" / unspecified | Lenovo LOQ 15APH8 (Model 82XT) | Canonicalized in `machine_specs.json` |
| **CPU Name** | "AMD64 Family 25 Model 116" | AMD Ryzen 7 7840HS w/ Radeon 780M Graphics | Corrected across all evaluation docs |
| **Physical Cores** | "16-core processor" (confused logical/physical) | 8 physical cores (16 logical threads) | Corrected in §6.1 and REPRODUCIBILITY.md |
| **Installed RAM** | "15.2 GB RAM" (reported usable) | 16.0 GB installed RAM (15.19 GB usable) | Corrected across manifests and tables |
| **Operating System** | "Windows 10 (AMD64)" (kernel string artifact) | Microsoft Windows 11 Home Single Language (10.0.26200) | OS wins; corrected across all docs |
| **Discrete GPU** | Not disclosed | NVIDIA GeForce RTX 4060 Laptop GPU (8.0 GB VRAM) | Disclosed in §6.1; noted unused in CPU proving |
| **Canonical Proving**| Historical 0.5504 s / 0.7331 s / 0.64 s / 0.67 s | 0.5634 s (fresh canonical rerun) | Purged all historical values; replaced with 0.56 s |

