# Appendices

## Appendix A: Artifact Reproducibility Guide
*Topic Sentence:* All quantitative benchmarks, tables, and figures reported in this manuscript can be deterministically reproduced from a clean checkout using our automated evaluation pipeline.
- One-command reproduction: `uv run eval/run_all.py`
- Machine specifications: Windows 10, AMD64 16-core, 15.2 GB RAM, Python 3.11.9
- Toolchains: Foundry 1.5.1-stable, uv 0.11.15, ezkl 23.0.5, pnpm 12.16.1
- Verification manifest: `eval/results/manifest.json`

## Appendix B: Extended Proofs & Security Traces
*Topic Sentence:* We provide the full formal proof of Lemma 1 (Cross-Registry Unicity) and complete transaction receipts demonstrating the baseline double-issuance vulnerability.
- Formal proof of Lemma 1 (reduction to Keccak-256 collision resistance)
- Gas profile trace for `CarbonRegistry.issue` vs `Halo2Verifier.verifyProof`
- Anvil transaction broadcast receipt analysis (`BaselineDoubleIssuance.s.sol`)
