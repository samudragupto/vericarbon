# VeriCarbon Manuscript Detailed Outline (`paper/OUTLINE.md`)

Target Venue: Future Generation Computer Systems (FGCS), Elsevier.
Target Length: ~9,500–10,500 words.

---

## Outline Summary Table

| Section | Target Words | Paragraphs | Key Claim IDs | Tables / Figures |
| :--- | :---: | :---: | :--- | :--- |
| **§1 Introduction** | 1,200 | 6 | [C-04, C-08, C-09, C-10, C-15, C-16] | Fig. 1 (Architecture Overview) |
| **§2 Background & Related Work** | 900 | 4 | [C-15, C-16] | Table 1 (`related_work_matrix.md`) |
| **§3 System & Threat Model** | 1,100 | 5 | [C-15] | Assumptions A1–A6 & Non-Guarantees |
| **§4 VeriCarbon Design** | 1,700 | 8 | [C-06, C-07, C-08, C-15, C-20] | Defs 1–3, Lemma 1, A0 Narrative, Seq Diags |
| **§5 Implementation** | 700 | 3 | [C-07, C-14, C-20] | Stack summary, SDK, Indexer |
| **§6 Evaluation** | 1,900 | 13 | [C-01–C-13, C-15–C-19] | Tables 2–6, Figs 2–3 |
| **§7 Discussion & Limitations** | 900 | 4 | [C-01, C-03, C-10, C-11] | Honesty checklist & Future Directions |
| **§8 Conclusion & Future Work** | 300 | 2 | [C-04, C-09, C-10, C-15] | Summary & Roadmap |
| **Appendices A & B** | N/A | 4 | [C-01–C-20] | Full Reproducibility & Formal Proofs |
| **Total** | **8,700–9,500** | **49** | **All 20 Claims Mapped** | **5 Tables, 3 Figures** |

---

## Detailed Section-by-Section Plan

### Section 1: Introduction (Target: 1,200 words — 6 paragraphs)

* **Paragraph 1.1: The Carbon Market Integrity Crisis (200 words)**
  * *Topic Sentence:* Voluntary and compliance carbon credit markets suffer from profound credibility deficits driven by systematic over-crediting, baseline manipulation, and opaque verification intermediaries.
  * *Claims:* None.
  * *Citations:* `TODOCITE: West 2020 Amazon REDD+ overcrediting`, `TODOCITE: Greenfield 2023 Guardian Verra phantom credits`, `TODOCITE: Guizar-Coutino 2022 forest carbon evaluation`.
  * *Artifacts:* None.

* **Paragraph 1.2: The Double-Counting and Cross-Registry Failure Mode (220 words)**
  * *Topic Sentence:* Beyond baseline inflation, the fragmented registry ecosystem allows unscrupulous project developers to register identical physical land parcels across mutually isolated registries, multiplying issued credits without shared state reconciliation.
  * *Claims:* [C-16].
  * *Citations:* `TODOCITE: World Bank Climate Warehouse 2022`, `TODOCITE: Toucan Protocol tokenized carbon retrospective 2022`, `TODOCITE: UNFCCC Article 6 corresponding adjustments`.
  * *Artifacts:* Reference to Baseline Central Registry vulnerability demonstration receipt.

* **Paragraph 1.3: Limitations of Existing Solutions (200 words)**
  * *Topic Sentence:* Existing digital MRV (dMRV) initiatives either rely on centralized oracle networks that trust off-chain computation, or naive on-chain token bridges that simply wrap flawed paper certificates into ERC-20 tokens without verifying underlying biomass.
  * *Claims:* None.
  * *Citations:* `TODOCITE: KlimaDAO 2022 carbon liquidity dynamics`, `TODOCITE: Regen Network dMRV whitepaper`, `TODOCITE: Open Forest Protocol decentralized MRV`.
  * *Artifacts:* Table 1 (`paper/tables/related_work_matrix.md`).

* **Paragraph 1.4: The VeriCarbon Paradigm (220 words)**
  * *Topic Sentence:* We present VeriCarbon, a zero-knowledge verifiable MRV architecture that binds satellite-derived machine learning inferences directly to on-chain global geospatial nullifier sets.
  * *Claims:* [C-04, C-08].
  * *Citations:* `TODOCITE: ezkl Halo2 zero-knowledge inference engine`, `TODOCITE: Kang 2022 scaling ZKML`.
  * *Artifacts:* Figure 1 (Mermaid system architecture diagram).

* **Paragraph 1.5: Core Contributions and AMENDMENT A0 (220 words)**
  * *Topic Sentence:* This paper makes four key contributions: (1) a compact Halo2 SNARK decision-tree verifier proving biomass without exposing raw satellite rasters; (2) a salt-independent geospatial nullifier proving parcel unicity (Amendment A0); (3) an open test suite evaluating 7 attacks and 2 pre-A0 vulnerabilities; and (4) an end-to-end open-source prototype on Base Sepolia.
  * *Claims:* [C-09, C-10, C-15].
  * *Citations:* None.
  * *Artifacts:* Reference to Amendment A0 and Table 5 (`paper/tables/fraud_results.md`).

* **Paragraph 1.6: Paper Roadmap (140 words)**
  * *Topic Sentence:* The remainder of this paper is organized as follows: Section 2 contextualizes related work; Section 3 establishes the threat model; Section 4 details protocol design; Section 5 describes implementation; Section 6 evaluates empirical performance; Section 7 discusses limitations; and Section 8 concludes.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* None.

---

### Section 2: Background & Related Work (Target: 900 words — 4 paragraphs + Table 1)

* **Paragraph 2.1: Satellite Remote Sensing and Machine Learning for Biomass (220 words)**
  * *Topic Sentence:* Optical and synthetic aperture radar (SAR) remote sensing have become the gold standard for continuous forest canopy monitoring and Aboveground Biomass (AGB) estimation.
  * *Claims:* None.
  * *Citations:* `TODOCITE: Dubayah 2020 GEDI mission overview`, `TODOCITE: Santoro 2021 ESA CCI Biomass global dataset`, `TODOCITE: Lang 2023 high-resolution global canopy height maps`.
  * *Artifacts:* None.

* **Paragraph 2.2: Blockchain Carbon Registries and Web3 Offsetting (220 words)**
  * *Topic Sentence:* The intersection of blockchain and voluntary carbon markets began with permissionless tokenized credit bridges, which rapidly exposed structural vulnerabilities in credit origin quality and double-retirement accounting.
  * *Claims:* [C-16].
  * *Citations:* `TODOCITE: Toucan Protocol tokenized carbon retrospective 2022`, `TODOCITE: World Bank Climate Warehouse 2022`, `TODOCITE: Chia Climate Warehouse design`.
  * *Artifacts:* None.

* **Paragraph 2.3: Zero-Knowledge SNARKs and Verifiable Machine Learning (240 words)**
  * *Topic Sentence:* Zero-knowledge proofs (ZK-SNARKs) enable a prover to demonstrate that a specific computational graph produced an output from private inputs without revealing the inputs themselves or requiring redundant re-execution by verifiers.
  * *Claims:* None.
  * *Citations:* `TODOCITE: Ben-Sasson 2014 Zerocash`, `TODOCITE: ezkl Halo2 zero-knowledge inference engine`, `TODOCITE: Zhang 2020 zero-knowledge machine learning`.
  * *Artifacts:* None.

* **Paragraph 2.4: Synthesis and Gap Analysis (220 words)**
  * *Topic Sentence:* Despite rapid progress in both dMRV and ZKML, existing systems remain disjointed: no deployed protocol combines in-circuit machine learning bound to satellite rasters with salt-independent cross-registry geospatial nullifiers.
  * *Claims:* [C-15].
  * *Citations:* None.
  * *Artifacts:* Table 1 (`paper/tables/related_work_matrix.md`).

---

### Section 3: System & Threat Model (Target: 1,100 words — 5 paragraphs)

* **Paragraph 3.1: Protocol Participants and Trust Boundaries (220 words)**
  * *Topic Sentence:* The VeriCarbon network comprises five distinct participant classes: Project Developers, Independent MRV Auditors, Competing Registry Operators, Off-Chain Verifiers/Indexers, and Credit Buyers/Retirers.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* None.

* **Paragraph 3.2: Formal Cryptographic Assumptions (220 words)**
  * *Topic Sentence:* Protocol soundness rests upon three standard cryptographic assumptions: the collision resistance of Keccak-256 and Poseidon hash functions, the discrete logarithm / KZG polynomial commitment hardness over the BN254 elliptic curve, and existence of a tamper-evident decentralized storage network.
  * *Claims:* None.
  * *Citations:* `TODOCITE: Kate 2010 KZG polynomial commitments`, `TODOCITE: Grassi 2021 Poseidon hash function`.
  * *Artifacts:* None.

* **Paragraph 3.3: Adversary Capabilities and Attack Vectors (240 words)**
  * *Topic Sentence:* We model a Byzantine adversary capable of colluding with registry operators, manipulating off-chain evidence bundles, re-registering land with differing cryptographic salts, and forging retirement claims.
  * *Claims:* [C-15].
  * *Citations:* None.
  * *Artifacts:* Reference to Attacks A1–A7.

* **Paragraph 3.4: Security Guarantees Defended Cryptographically (220 words)**
  * *Topic Sentence:* VeriCarbon cryptographically guarantees: (1) Over-crediting prevention; (2) Cross-registry double issuance unicity; (3) Salt-dodge invariance (Amendment A0); and (4) Double-claiming retirement nullification.
  * *Claims:* [C-15].
  * *Citations:* None.
  * *Artifacts:* None.

* **Paragraph 3.5: Non-Guarantees and Explicit Trust Boundaries (200 words)**
  * *Topic Sentence:* Crucially, VeriCarbon does NOT defend against physical-layer satellite sensor spoofing, upstream ESA tile corruption, or distribution shift when models trained on Amazon rainforests are applied to uncalibrated biomes.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Reference to `docs/REPRODUCIBILITY.md` limitations log.

---

### Section 4: VeriCarbon Design (Target: 1,700 words — 8 paragraphs)

* **Paragraph 4.1: Architecture Overview and Layered State Machine (220 words)**
  * *Topic Sentence:* VeriCarbon decouples heavy spatial-temporal satellite ingestion from concise on-chain consensus via a three-tier architecture: off-chain remote sensing feature extraction, client-side Halo2 ZK proof generation, and an EVM Layer 2 nullifier registry.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Figure 1 (Architecture diagram).

* **Paragraph 4.2: Definition 1 — Geospatial Commitment & Plot Privacy (220 words)**
  * *Topic Sentence:* To preserve commercial landholder confidentiality prior to formal credit issuance, project registration anchors land boundaries to a salted geospatial commitment.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Mathematical formulation of $\text{geoCommitment} = \text{keccak256}(\text{geohash8} \parallel \text{salt})$.

* **Paragraph 4.3: Definition 2 — Salt-Independent Global Issuance Nullifier (Amendment A0) (240 words)**
  * *Topic Sentence:* The core contribution of Amendment A0 is that the issuance nullifier strictly decouples land identity from project salt and registry identity, preventing salt-dodging.
  * *Claims:* [C-15].
  * *Citations:* None.
  * *Artifacts:* Mathematical formulation of $\text{issuanceNullifier} = \text{keccak256}(\text{geohash8} \parallel \text{vintageYear} \parallel \text{creditType})$.

* **Paragraph 4.4: The Salt-Dodge Vulnerability Narrative (Hole A & Hole B Discovery) (240 words)**
  * *Topic Sentence:* In initial pre-A0 protocol designs, binding the issuance nullifier to `projectId` or `geoCommitment` created a fatal vulnerability: a malicious actor could register the identical parcel with differing salts and mint multiple credit batches.
  * *Claims:* [C-15, C-16].
  * *Citations:* None.
  * *Artifacts:* Table 5 (`paper/tables/fraud_results.md` Hole A & B rows).

* **Paragraph 4.5: Definition 3 — Single-Claim Retirement Nullifier (200 words)**
  * *Topic Sentence:* When corporate buyers retire carbon credits to offset emissions, the registry atomically burns the ERC-1155 tokens and registers a deterministic claim nullifier.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Mathematical formulation of $\text{claimNullifier} = \text{keccak256}(\text{issuanceNullifier} \parallel \text{claimant} \parallel \text{claimType} \parallel \text{beneficiaryCommitment})$.

* **Paragraph 4.6: Lemma 1 — Cross-Registry Issuance Unicity and Proof (220 words)**
  * *Topic Sentence:* We formalize the unicity guarantee in Lemma 1: under collision resistance of Keccak-256 and validity of the Halo2 proof, no physical parcel represented by a `geohash8` cell can be credited more than once per vintage year and credit type across any participating registries.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Formal proof of Lemma 1.

* **Paragraph 4.7: Zero-Knowledge MRV Circuit Construction (200 words)**
  * *Topic Sentence:* The verifiable MRV circuit compiles a quantized gradient-boosted decision tree ensemble into Halo2 arithmetic constraints over the BN254 scalar field.
  * *Claims:* [C-06, C-07].
  * *Citations:* `TODOCITE: ezkl Halo2 zero-knowledge inference engine`.
  * *Artifacts:* Workspace meta specification.

* **Paragraph 4.8: On-Chain Verification and Monotonic Batch Minting (160 words)**
  * *Topic Sentence:* Upon validating the Halo2 proof and asserting unspent issuance nullifiers, `CarbonRegistry.sol` mints ERC-1155 credit tokens assigned to a monotonically increasing serial batch ID.
  * *Claims:* [C-08, C-20].
  * *Citations:* None.
  * *Artifacts:* Contract NatSpec reference.

---

### Section 5: Implementation (Target: 700 words — 3 paragraphs)

* **Paragraph 5.1: Python Satellite Pipeline (`services/mrv`) (240 words)**
  * *Topic Sentence:* The MRV data pipeline is implemented in Python 3.11 using `uv`, querying Sentinel-2 L2A STAC items and ESA WorldCover rasters from Microsoft Planetary Computer to compute 12 spectral and categorical features.
  * *Claims:* None.
  * *Citations:* `TODOCITE: pystac-client Microsoft Planetary Computer STAC`.
  * *Artifacts:* Reference to dataset manifest.

* **Paragraph 5.2: Halo2 ZK Engine & Contract Verification (`services/zk` & `packages/contracts`) (240 words)**
  * *Topic Sentence:* Circuit compilation and proving leverage `ezkl v23.0.5`, emitting `Halo2Verifier.sol` which executes KZG multi-point pairing checks in EVM bytecode.
  * *Claims:* [C-07, C-20].
  * *Citations:* `TODOCITE: OpenZeppelin contracts v5.2.0`.
  * *Artifacts:* `forge build --sizes` measurement.

* **Paragraph 5.3: Web Application, SDK & Postgres Sync Double (`apps/web` & `supabase`) (220 words)**
  * *Topic Sentence:* The user interface is developed in Next.js 15 and MapLibre GL, communicating via a shared TypeScript SDK with unified `viem@2.57.13` and backed by a PostgreSQL 16 schema tested offline via PGlite.
  * *Claims:* [C-14].
  * *Citations:* None.
  * *Artifacts:* Lighthouse score report.

---

### Section 6: Evaluation (Target: 1,900 words — 13 paragraphs across 5 subsections)

#### 6.1 Experimental Setup & Pipeline Validation (2 paragraphs)
* **Paragraph 6.1.1: Experimental Testbed & Reproducibility Harness (150 words)**
  * *Topic Sentence:* All benchmarks are executed on a commodity laptop (Windows 10, AMD64 16-core, 15.2 GB RAM) and Base Sepolia testnet under fixed seed `SEED = 42`.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* `eval/results/manifest.json`.
* **Paragraph 6.1.2: MRV Model Spatial-Block Validation (170 words)**
  * *Topic Sentence:* We evaluate model generalization using 4-fold spatial-block cross-validation over four quadrant partition blocks (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`), emphasizing that results reflect internal self-consistency on synthesized fixtures rather than field claims.
  * *Claims:* [C-01, C-02, C-03, C-17, C-18, C-19].
  * *Citations:* None.
  * *Artifacts:* Table 2 (`paper/tables/model_metrics.md`).

#### 6.2 RQ1: ZK Proving Feasibility & Verifier Overhead (3 paragraphs)
* **Paragraph 6.2.1: Prover Sizing and Latency Sweep (170 words)**
  * *Topic Sentence:* Sweep results across feature dimensions $F \in \{8, 12, 16, 32\}$ and trees $T \in \{2, 4, 8\}$ demonstrate that our canonical 12-feature circuit proves in just 0.55s on a laptop CPU.
  * *Claims:* [C-04, C-05].
  * *Citations:* None.
  * *Artifacts:* Table 3 (`paper/tables/zk_benchmarks.md`), Figure 2 (`paper/figures/proving_time.png`).
* **Paragraph 6.2.2: Circuit Complexity vs Proof Size Scaling (140 words)**
  * *Topic Sentence:* Halo2 KZG proofs remain strictly constant at 4,032 bytes regardless of tree depth or feature count.
  * *Claims:* [C-06].
  * *Citations:* None.
  * *Artifacts:* Table 3 (`paper/tables/zk_benchmarks.md`).
* **Paragraph 6.2.3: EVM Bytecode & Gas Verification Feasibility (140 words)**
  * *Topic Sentence:* The compiled `Halo2Verifier.sol` occupies 18,007 bytes (below the 24,576 B EIP-170 limit) and consumes 643,269 gas.
  * *Claims:* [C-07, C-08].
  * *Citations:* None.
  * *Artifacts:* `forge build --sizes` and Table 3.

#### 6.3 RQ2: Security Evaluation & Byzantine Fraud Mitigation (3 paragraphs)
* **Paragraph 6.3.1: Attack Suite Construction & Foundry Methodology (160 words)**
  * *Topic Sentence:* We construct an adversarial test suite evaluating seven canonical carbon market fraud attacks (A1–A7) alongside two pre-A0 vulnerability tests.
  * *Claims:* [C-15].
  * *Citations:* None.
  * *Artifacts:* Table 5 (`paper/tables/fraud_results.md`).
* **Paragraph 6.3.2: Empirical Attack Interception Results (160 words)**
  * *Topic Sentence:* In VeriCarbon, every fraud attempt reverts with a deterministic error code, while the centralized baseline permits double-spending.
  * *Claims:* [C-15, C-16].
  * *Citations:* None.
  * *Artifacts:* Table 5 (`paper/tables/fraud_results.md`).
* **Paragraph 6.3.3: Empirical Demonstration of Baseline Double Issuance (150 words)**
  * *Topic Sentence:* Running `BaselineDoubleIssuance.s.sol` programmatically demonstrates that two competing registries issue 1,088 credits against the same land.
  * *Claims:* [C-16].
  * *Citations:* None.
  * *Artifacts:* `eval/results/baseline_double_issuance_receipt.json`.

#### 6.4 RQ3: Economic Cost Modeling & Latency Overhead (3 paragraphs)
* **Paragraph 6.4.1: Gas Decomposition of Issuance and Retirement (150 words)**
  * *Topic Sentence:* Execution gas benchmarks show that `CarbonRegistry.issue` consumes 873,164 gas, dominated by ZK proof verification.
  * *Claims:* [C-08, C-09].
  * *Citations:* None.
  * *Artifacts:* Table 4 (`paper/tables/gas_costs.md`), Figure 3 (`paper/figures/gas_comparison.png`).
* **Paragraph 6.4.2: Modeled USD Cost: Base L2 vs Ethereum L1 (150 words)**
  * *Topic Sentence:* Translating gas units under modeled prices ($2,500/ETH, 0.005 gwei L2, 25 gwei L1) demonstrates that Base L2 reduces issuance costs from $54.57 on L1 to $0.0119 on Base.
  * *Claims:* [C-10, C-11].
  * *Citations:* None.
  * *Artifacts:* Table 4 (`paper/tables/gas_costs.md`), Figure 3.
* **Paragraph 6.4.3: Network Latency and Off-Chain Indexing Lag (140 words)**
  * *Topic Sentence:* Public RPC roundtrip latency averages 595.14 ms (p95), while the indexer exhibits a p95 lag of 31.57 ms.
  * *Claims:* [C-12, C-13].
  * *Citations:* None.
  * *Artifacts:* Table 6 (`paper/tables/latency.md`).

#### 6.5 RQ4: Privacy vs. Auditability Trade-Off (2 paragraphs)
* **Paragraph 6.5.1: The Privacy-Preserving Parcel Boundary Guarantee (140 words)**
  * *Topic Sentence:* Off-chaining raw imagery and hashing land parcels into `geohash8` commitments shields commercial timber operations from reconnaissance while enabling verifiable unicity.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Discussion of Poseidon vs SHA-256.
* **Paragraph 6.5.2: In-Circuit Arithmetic Binding vs SHA-256 Audit Pointers (130 words)**
  * *Topic Sentence:* We explicitly document the trade-off of binding feature commitments in-circuit via `ezkl.poseidon_hash` while maintaining SHA-256 in the IPFS bundle.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* Reference to `workspace_meta.json`.

---

### Section 7: Discussion & Limitations (Target: 900 words — 4 paragraphs)

* **Paragraph 7.1: Cryptographic Nullifiers as Article 6 Analogues (240 words)**
  * *Topic Sentence:* The unicity nullifiers introduced in VeriCarbon provide a decentralized, mathematical analogue to UNFCCC Article 6 corresponding adjustments.
  * *Claims:* None.
  * *Citations:* `TODOCITE: UNFCCC Article 6 corresponding adjustments`, `TODOCITE: World Bank Climate Warehouse 2022`.
  * *Artifacts:* None.

* **Paragraph 7.2: Physical-Layer Oracle Challenges and Sensor Spoofing (220 words)**
  * *Topic Sentence:* Zero-knowledge proofs verify computational integrity over ingested inputs but cannot detect spoofing at the spaceborne sensor or optical pipeline level.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* None.

* **Paragraph 7.3: Synthesized Labels and Biome Generalization Boundaries (220 words)**
  * *Topic Sentence:* A fundamental limitation of this prototype is that Aboveground Biomass labels were generated from synthesized allometric fixtures due to Planetary Computer STAC authentication boundaries.
  * *Claims:* [C-01, C-03].
  * *Citations:* None.
  * *Artifacts:* Reference to `model_metrics.md` caption.

* **Paragraph 7.4: Economic Sizing and L2 Finality Considerations (220 words)**
  * *Topic Sentence:* While Base L2 delivers 4,500× cost reductions ($0.0119 per issuance), commercial deployments must weigh optimistic rollup challenge windows against credit settlement velocity.
  * *Claims:* [C-10, C-11].
  * *Citations:* None.
  * *Artifacts:* None.

---

### Section 8: Conclusion & Future Work (Target: 300 words — 2 paragraphs)

* **Paragraph 8.1: Summary of Contributions (150 words)**
  * *Topic Sentence:* In this paper, we introduced VeriCarbon, demonstrating that zero-knowledge verifiable MRV and salt-independent cross-registry nullifiers can eliminate over-crediting and cross-registry double issuance at sub-cent transaction costs.
  * *Claims:* [C-04, C-09, C-10, C-15].
  * *Citations:* None.
  * *Artifacts:* None.

* **Paragraph 8.2: Future Work and Open Challenges (150 words)**
  * *Topic Sentence:* Future research must expand from discrete `geohash8` centroids to full spatial polygon intersection proofs in zero knowledge and incorporate hardware-signed satellite telemetry.
  * *Claims:* None.
  * *Citations:* None.
  * *Artifacts:* None.

---

### Appendices

* **Appendix A: Artifact Reproducibility Guide**
  * One-command evaluation reproduction (`uv run eval/run_all.py`), lockfile hashes, hardware specifications, and manifest verification.
* **Appendix B: Extended Formal Proofs & Security Attack Traces**
  * Mathematical proof of Lemma 1 (Unicity), detailed Foundry gas trace snapshots, and EVM transaction receipts from `BaselineDoubleIssuance.s.sol`.
