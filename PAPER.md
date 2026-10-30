# PAPER.md — VeriCarbon manuscript — SOURCE OF TRUTH (v2)

## Venue & format
Primary: Future Generation Computer Systems (FGCS), Elsevier, single-anonymized.
Backups: Journal of Network and Computer Applications; Blockchain: Research and
Applications. Workflow: drafts in paper/sections/*.md → LaTeX (elsarticle) assembly in
paper/manuscript.tex, refs in paper/refs.bib. Figures vector PDF (matplotlib PDF backend);
tables \input from paper/tables/. Body ~9,500–10,500 words. Abstract 150–200 words.
Highlights: 5 bullets, each ≤85 characters.

## Title (working)
VeriCarbon: Zero-Knowledge Verifiable MRV and Cross-Registry Nullifiers for Carbon Credit
Integrity

## Contribution claim (do not inflate)
A research prototype that (i) proves a bound on claimed tCO2e from a committed, quantized
MRV model via Halo2/KZG (ezkl) without publishing raw imagery, and (ii) makes cross-registry
double issuance of the same (geohash8, vintageYear, creditType) revert via a global on-chain
nullifier that deliberately omits both salt and registryId. Hybrid architecture:
commitments/nullifiers/tokens/verifier on Base Sepolia; evidence on IPFS; indexes in
Postgres. Includes a discovered-and-fixed salt-dodge vector (Amendment A0) reported as part
of the security analysis.

## Research questions (these headings only; no RQ5)
- RQ1: Can ZK proofs over a compact remote-sensing MRV model be generated and verified at
  practical laptop/EVM cost?
- RQ2: Does the issuance/claim nullifier design eliminate double-claiming under mutually
  distrusting (Byzantine) registries? Formal argument + Foundry attack suite A1–A7.
- RQ3: What is the gas/latency/USD overhead of the hybrid stack vs L1 and vs a centralized
  transfer-log baseline?
- RQ4: What privacy–auditability trade-off remains when imagery stays off-chain and SHA-256
  is not computed in-circuit?

## Non-negotiable writing rules
1. PROVENANCE: no number in prose unless it exists in paper/evidence_map.json with
   {value, artifact_path, source_key}. Tables are \input, never retyped.
2. OVERCLAIM BLACKLIST — banned: "prevents all fraud", "solves double counting",
   "guarantees carbon integrity", "accurate AGB estimation", "tamper-proof", "Article 6
   compliant", "production-ready". Approved: "cryptographically prevents re-issuance of the
   same (geohash8, vintageYear, creditType) across participating registries";
   "self-consistency on synthesized fixtures — not a field-accuracy claim".
   The model-metrics table is NEVER cited as accuracy; it is pipeline validation.
3. ATTACK PARITY: every "prevented" maps 1:1 to a passing forge test (A1–A7). No test →
   the word "prevented" is banned.
4. CITATIONS: only works you can name with venue and year; otherwise insert `TODOCITE:
   query` and end the sentence. Every bib entry carries `% TODO-VERIFY-DOI`. Never invent
   DOIs, pages, or author lists. Human verifies 100% of DOIs at GATE 3.
5. ABSTRACT DISCIPLINE: every abstract number appears in a main-body table.
6. NO SILENT SCOPE-SHRINKING: every item in docs/REPRODUCIBILITY.md "Known Limitations"
   surfaces in Threat Model or Discussion.

## Mandatory honesty (desk-reject if omitted)
1. AGB labels are SYNTHESIZED (SEED=42) from WorldCover + Sentinel-2 indices (GEDI L4A and
   ESA CCI Biomass unavailable without extra auth on Planetary Computer public STAC).
   R² is fixture-relative; disclose synthetic labels BEFORE any R² sentence, anywhere.
2. In-circuit hash is NOT SHA-256: ezkl Poseidon binding over field elements; off-chain
   SHA-256 dataCommitment lives in the IPFS bundle as an audit pointer. State in Methods
   and Limitations.
3. All chain results are testnet/Anvil only. USD costs are a labeled model (assumptions
   quoted verbatim from the eval/gas_costs.py config block), never live prices. Never
   write a headline ratio (e.g. "4500×") unless computed in-text from the JSON.
4. Nullifiers are a CRYPTOGRAPHIC ANALOGUE of Article 6 corresponding adjustments, not a
   UNFCCC mechanism or legal equivalence.
5. Every table/figure regenerable by `uv run eval/run_all.py`; cite eval/results/manifest.json.

## Canonical numbers (POST-A0 — read from artifacts; if sources disagree, the JSON wins
and the discrepancy is flagged in paper/CLAIMS_LOG.md — never resolve from memory)
- SEED=42; AOI Tapajós chip (-54.8485,-2.8172,-54.8390,-2.8078).
- Spatial split precision: geohash5 quadrant partitioning over the 1.05 km × 1.05 km chip (quadrants: 6z2zz, 6z3pb, 6z8bp, 6z900) from dataset_manifest.json to evaluate spatial-block generalization and prevent spatial autocorrelation leakage. Parcel-level commitments and nullifiers use geohash8 (~38.2m × 19.1m).
- TCO2E_PER_TON_AGB = 0.47 × 44/12 = 1.7233333333333334 (IPCC 2006 Vol.4 AFOLU Ch.4,
  Table 4.3) — the one constant that may be quoted directly.
- Nullifiers (Amendment A0 canonical):
  geoCommitment    = keccak256(abi.encode(geohash8, salt))                    [registration linkage only]
  issuanceNullifier= keccak256(abi.encode(geohash8, vintageYear, creditType)) // no salt, no registryId
  claimNullifier   = keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))
  creditType ∈ {REMOVAL, REDUCTION}; 2000 ≤ vintageYear ≤ current year.
- Circuit: F=12, T=4, depth=2, logrows=13, input_scale=param_scale=7. Proving time = 0.5504s (0.55s), setup time = 0.725s, proof size = 4,032 bytes, verifier bytecode = 18,007 bytes (Spurious Dragon limit: 24,576 bytes), verify gas = 643,269 gas. All canonical values from eval/results/zk_benchmarks.json and forge build --sizes (reconciled in Stage B).
- Verifier size vs EIP-170 (24,576 B): 18,007 bytes deployed measured from forge build --sizes.
- R²: 0.9869 (MAE: 3.7514 Mg/ha) from eval/results/model_metrics.json, captioned "self-consistency on synthesized fixtures — NOT a field-accuracy claim".

## Section skeleton & word budgets
1 Introduction (1,200) · 2 Background & Related Work (900; matrix ≥22 rows) ·
3 System & Threat Model (1,100; assumptions A1–A6, non-guarantees) · 4 VeriCarbon Design
(1,700; Definitions 1–3, Lemma 1 unicity, salt-dodge narrative) · 5 Implementation (700) ·
6 Evaluation (1,900; 6.1 setup, 6.2 RQ1, 6.3 RQ2, 6.4 RQ3, 6.5 RQ4) · 7 Discussion (900) ·
8 Conclusion (300) + future-work paragraph · Appendix A reproducibility · Appendix B
extended tables.

## What this paper is not
Not a production carbon registry. Not a claim of real tCO2e. Not ZKML over full Sentinel
tiles. Not a legal corresponding-adjustment system.

## Definition of done for any draft
Provenance check + blacklist check + attack-parity check + limitations-coverage check +
paper/CLAIMS_LOG.md entry.

