# CLAIMS_LOG.md — Manuscript Claims Registry

| Claim ID | Section | Prose Claim | Artifact Path / Source Key | Value / Finding | Date Added / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| C-01 | §6.2 (RQ1) | Canonical ZK proving time on laptop CPU | `eval/results/zk_benchmarks.json` -> `results[3].proving_time_s` | 0.5504 s (~0.55 s) (reconciled in Stage B) | 2026-10-30 / Canonical |
| C-02 | §4.2, §5.1 | Geospatial split & commitment precision | `services/mrv/tests/fixtures/dataset_manifest.json` | Splits: geohash5 (4 quadrants); Parcel/Nullifier: geohash8 | 2026-10-30 / Canonical |
| C-03 | §4.3 (A0) | Global salt-independent issuance nullifier | `packages/contracts/src/CarbonRegistry.sol` | `keccak256(abi.encode(geohash8, vintageYear, creditType))` | 2026-10-30 / Canonical |
| C-04 | §6.2 (RQ1) | Halo2Verifier EVM bytecode size | `forge build --sizes` | 18,007 bytes (< 24,576 B EIP-170 limit) | 2026-10-30 / Canonical |
| C-05 | §6.2 (RQ1) | Halo2Verifier on-chain verification gas | `eval/results/zk_benchmarks.json` -> `results[3].verification_gas` | 643,269 gas | 2026-10-30 / Canonical |
| C-06 | §6.1 | Model CV performance (fixture self-consistency) | `eval/results/model_metrics.json` -> `canonical_holdout` | R² = 0.9869, MAE = 3.7514 Mg/ha | 2026-10-30 / Canonical |
| C-07 | §6.3 (RQ2) | Fraud mitigation attack matrix | `eval/results/fraud_results.json` | 7 attacks (A1–A7) + 2 pre-A0 holes + baseline demo | 2026-10-30 / Canonical |


