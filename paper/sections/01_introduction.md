# Section 1: Introduction (Word Budget: 1,200 words)

## 1.1 The Voluntary Carbon Market Credibility Deficit
*Topic Sentence:* Voluntary and compliance carbon credit markets suffer from profound credibility deficits driven by systematic over-crediting, baseline manipulation, and opaque verification intermediaries.
- Key concepts: Over-crediting in tropical forest REDD+ projects; perverse financial incentives of centralized verification auditors; systemic divergence between claimed vs. actual carbon stock.
- Target words: 200 words.
- Claims: None.
- Citations: TODOCITE: West 2020 Amazon REDD+ overcrediting; TODOCITE: Greenfield 2023 Guardian Verra phantom credits; TODOCITE: Guizar-Coutino 2022 forest carbon evaluation.

## 1.2 The Cross-Registry Double-Counting Failure Mode
*Topic Sentence:* Beyond baseline inflation, the fragmented registry ecosystem allows unscrupulous project developers to register identical physical land parcels across mutually isolated registries, multiplying issued credits without shared state reconciliation.
- Key concepts: Absence of shared decentralized state across Verra, Gold Standard, and national registries; duplicate issuance of identical biophysical plots; failure of off-chain bilateral reconciliation.
- Target words: 220 words.
- Claims: [CLAIM: C-16: 1088 baseline double-issued credits].
- Citations: TODOCITE: World Bank Climate Warehouse 2022; TODOCITE: Toucan Protocol tokenized carbon retrospective 2022; TODOCITE: UNFCCC Article 6 corresponding adjustments.

## 1.3 Structural Limitations of Prior Digital MRV and Blockchain Proposals
*Topic Sentence:* Existing digital MRV (dMRV) initiatives either rely on centralized oracle networks that trust off-chain computation, or naive on-chain token bridges that simply wrap flawed paper certificates into ERC-20 tokens without verifying underlying biomass.
- Key concepts: Trusted execution oracle compromises; absence of cryptographic proofs over raw imagery; double-retirement and vintage relabeling exploits in early Web3 token bridges.
- Target words: 200 words.
- Claims: None.
- Citations: TODOCITE: KlimaDAO 2022 carbon liquidity dynamics; TODOCITE: Regen Network dMRV whitepaper; TODOCITE: Open Forest Protocol decentralized MRV.
- Artifacts: \input{tables/related_work_matrix.md}

## 1.4 The VeriCarbon Paradigm: ZK-SNARKs and Global Nullifiers
*Topic Sentence:* We present VeriCarbon, a zero-knowledge verifiable MRV architecture that binds satellite-derived machine learning inferences directly to on-chain global geospatial nullifier sets.
- Key concepts: End-to-end zero-knowledge verification over spaceborne optical imagery; fixed-point gradient-boosted decision tree proofs in Halo2; eliminating raw imagery disclosure while certifying mathematical correctness.
- Target words: 220 words.
- Claims: [CLAIM: C-04: 0.5504s laptop CPU proving time]; [CLAIM: C-08: 643269 verify gas].
- Citations: TODOCITE: ezkl Halo2 zero-knowledge inference engine; TODOCITE: Kang 2022 scaling ZKML.
- Artifacts: Figure 1 (Architecture diagram).

## 1.5 Core Contributions and Discovery of Amendment A0
*Topic Sentence:* This paper makes four key contributions: (1) a compact Halo2 SNARK decision-tree verifier proving biomass without exposing raw satellite rasters; (2) a salt-independent geospatial nullifier proving parcel unicity (Amendment A0); (3) an open test suite evaluating 7 attacks and 2 pre-A0 vulnerabilities; and (4) an end-to-end open-source prototype on Base Sepolia.
- Key concepts: Discovery of the salt-dodge vulnerability in pre-A0 designs; rigorous mitigation linking registration commitments to salt-independent nullifiers; empirical sub-cent L2 economics.
- Target words: 220 words.
- Claims: [CLAIM: C-09: 873164 issuance total gas]; [CLAIM: C-10: $0.0119 Base Sepolia modeled USD]; [CLAIM: C-15: 9 security attacks evaluated].
- Citations: None.
- Artifacts: \input{tables/fraud_results.md}

## 1.6 Manuscript Organization
*Topic Sentence:* The remainder of this paper is organized as follows: Section 2 contextualizes related work; Section 3 establishes the threat model; Section 4 details protocol design; Section 5 describes implementation; Section 6 evaluates empirical performance; Section 7 discusses limitations; and Section 8 concludes.
- Target words: 140 words.
- Claims: None.
- Citations: None.
