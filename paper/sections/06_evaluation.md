# Section 6: Evaluation (Word Budget: 1,900 words across 5 subsections)

## 6.1 Experimental Setup & Pipeline Validation
*Topic Sentence 1 (Testbed):* All benchmarks are executed on a commodity laptop (Windows 10, AMD64 16-core, 15.2 GB RAM) and Base Sepolia testnet under fixed seed `SEED = 42`.
*Topic Sentence 2 (Model Validation):* We evaluate model generalization using 4-fold spatial-block cross-validation over four quadrant partition blocks (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`), emphasizing that results reflect internal self-consistency on synthesized fixtures rather than field claims.
- Target words: 320 words across 2 paragraphs.
- Claims: [CLAIM: C-01: 3.7514 MAE canonical holdout]; [CLAIM: C-02: 8.1675 RMSE canonical holdout]; [CLAIM: C-03: 0.9869 R2 canonical holdout]; [CLAIM: C-17: 5.2901 CV MAE Mean]; [CLAIM: C-18: 11.6196 CV RMSE Mean]; [CLAIM: C-19: 0.8812 CV R2 Mean].
- Citations: None.
- Artifacts: \input{tables/model_metrics.md}

## 6.2 RQ1: ZK Proving Feasibility & Verifier Overhead
*Topic Sentence 1 (Prover Sizing):* Sweep results across feature dimensions $F \in \{8, 12, 16, 32\}$ and trees $T \in \{2, 4, 8\}$ demonstrate that our canonical 12-feature circuit proves in just 0.55s on a laptop CPU.
*Topic Sentence 2 (Proof Size Invariance):* Halo2 KZG proofs remain strictly constant at 4,032 bytes regardless of tree depth or feature count.
*Topic Sentence 3 (EVM Verification Gas):* The compiled `Halo2Verifier.sol` occupies 18,007 bytes (below the 24,576 B EIP-170 limit) and consumes 643,269 gas.
- Target words: 450 words across 3 paragraphs.
- Claims: [CLAIM: C-04: 0.5504s proving time]; [CLAIM: C-05: 0.725s setup time]; [CLAIM: C-06: 4032 bytes proof size]; [CLAIM: C-07: 18007 bytes verifier initcode]; [CLAIM: C-08: 643269 verify gas].
- Citations: None.
- Artifacts: \input{tables/zk_benchmarks.md}, \includegraphics{figures/proving_time.png}

## 6.3 RQ2: Security Evaluation & Byzantine Fraud Mitigation
*Topic Sentence 1 (Adversarial Suite):* We construct an adversarial test suite evaluating seven canonical carbon market fraud attacks (A1–A7) alongside two pre-A0 vulnerability tests.
*Topic Sentence 2 (Attack Interception):* In VeriCarbon, every fraud attempt reverts with a deterministic error code, while the centralized baseline permits double-spending.
*Topic Sentence 3 (Empirical Double-Issuance):* Running `BaselineDoubleIssuance.s.sol` programmatically demonstrates that two competing registries issue 1,088 credits against the same land.
- Target words: 470 words across 3 paragraphs.
- Claims: [CLAIM: C-15: 9 security attacks evaluated]; [CLAIM: C-16: 1088 baseline double-issued credits].
- Citations: None.
- Artifacts: \input{tables/fraud_results.md}, reference to `baseline_double_issuance_receipt.json`.

## 6.4 RQ3: Economic Cost Modeling & Latency Overhead
*Topic Sentence 1 (Gas Decomposition):* Execution gas benchmarks show that `CarbonRegistry.issue` consumes 873,164 gas, dominated by ZK proof verification.
*Topic Sentence 2 (USD Cost Comparison):* Translating gas units under modeled prices ($2,500/ETH, 0.005 gwei L2, 25 gwei L1) demonstrates that Base L2 reduces issuance costs from $54.57 on L1 to $0.0119 on Base.
*Topic Sentence 3 (Network Latency & Lag):* Public RPC roundtrip latency averages 595.14 ms (p95), while the indexer exhibits a p95 lag of 31.57 ms.
- Target words: 440 words across 3 paragraphs.
- Claims: [CLAIM: C-08: 643269 verify gas]; [CLAIM: C-09: 873164 issuance total gas]; [CLAIM: C-10: $0.0119 Base Sepolia modeled USD]; [CLAIM: C-11: $54.57 Ethereum L1 modeled USD]; [CLAIM: C-12: 595.14ms RPC roundtrip p95]; [CLAIM: C-13: 31.57ms indexer lag p95].
- Citations: None.
- Artifacts: \input{tables/gas_costs.md}, \input{tables/latency.md}, \includegraphics{figures/gas_comparison.png}

## 6.5 RQ4: Privacy vs. Auditability Trade-Off
*Topic Sentence 1 (Parcel Privacy):* Off-chaining raw imagery and hashing land parcels into `geohash8` commitments shields commercial timber operations from reconnaissance while enabling verifiable unicity.
*Topic Sentence 2 (In-Circuit Binding):* We explicitly document the trade-off of binding feature commitments in-circuit via `ezkl.poseidon_hash` while maintaining SHA-256 in the IPFS bundle.
- Target words: 270 words across 2 paragraphs.
- Claims: None.
- Citations: None.
- Artifacts: Reference to `workspace_meta.json`.
