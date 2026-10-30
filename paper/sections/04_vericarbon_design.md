# Section 4: VeriCarbon Design (Word Budget: 1,700 words)

## 4.1 Layered Architectural Decomposition
*Topic Sentence:* VeriCarbon decouples heavy spatial-temporal satellite ingestion from concise on-chain consensus via a three-tier architecture: off-chain remote sensing feature extraction, client-side Halo2 ZK proof generation, and an EVM Layer 2 nullifier registry.
- Key concepts: Separation of heavy data pipeline from succinct EVM verification; verifiable computation workflow; cryptographic binding across tiers.
- Target words: 220 words.
- Claims: None.
- Citations: None.
- Artifacts: Figure 1 (Mermaid sequence & component diagrams).

## 4.2 Definition 1: Geospatial Commitment & Commercial Privacy
*Topic Sentence:* To preserve commercial landholder confidentiality prior to formal credit issuance, project registration anchors land boundaries to a salted geospatial commitment.
- Key concepts: Client-side blinding salt; hiding raw spatial coordinates before issuance; binding project ID to immutable land commitment.
- Formulation: $geoCommitment := \text{keccak256}(\text{abi.encode}(geohash8, salt))$.
- Target words: 220 words.
- Claims: None.
- Citations: None.

## 4.3 Definition 2: Salt-Independent Global Issuance Nullifier (Amendment A0)
*Topic Sentence:* The core contribution of Amendment A0 is that the issuance nullifier strictly decouples land identity from project salt and registry identity, preventing salt-dodging.
- Key concepts: Global parcel unicity; salt-independent nullifier; registry-independent state machine; cross-registry collision enforcement.
- Formulation: $issuanceNullifier := \text{keccak256}(\text{abi.encode}(geohash8, vintageYear, creditType))$.
- Target words: 240 words.
- Claims: [CLAIM: C-15: 9 security attacks evaluated].
- Citations: None.

## 4.4 The Salt-Dodge Vulnerability Narrative (Hole A & Hole B Discovery)
*Topic Sentence:* In initial pre-A0 protocol designs, binding the issuance nullifier to `projectId` or `geoCommitment` created a fatal vulnerability: a malicious actor could register the identical parcel with differing salts and mint multiple credit batches.
- Key concepts: Discovery of Hole A (Salt-Dodge Attack) and Hole B (Unbounded Vintage Relabeling); formal demonstration on `PreA0CarbonRegistry.sol`; engineering of the A0 fix.
- Target words: 240 words.
- Claims: [CLAIM: C-15: 9 security attacks evaluated]; [CLAIM: C-16: 1088 baseline double-issued credits].
- Citations: None.
- Artifacts: \input{tables/fraud_results.md}

## 4.5 Definition 3: Single-Claim Retirement Nullifier
*Topic Sentence:* When corporate buyers retire carbon credits to offset emissions, the registry atomically burns the ERC-1155 tokens and registers a deterministic claim nullifier.
- Key concepts: Preventing retirement replays; binding claimant, beneficiary commitment, and issuance batch; permanent non-fungible claim tracking.
- Formulation: $claimNullifier := \text{keccak256}(\text{abi.encode}(issuanceNullifier, claimant, claimType, beneficiaryCommitment))$.
- Target words: 200 words.
- Claims: None.
- Citations: None.

## 4.6 Lemma 1: Cross-Registry Issuance Unicity and Proof
*Topic Sentence:* We formalize the unicity guarantee in Lemma 1: under collision resistance of Keccak-256 and validity of the Halo2 proof, no physical parcel represented by a `geohash8` cell can be credited more than once per vintage year and credit type across any participating registries.
- Key concepts: Formal theorem statement; proof by contradiction reducing double-issuance to Keccak-256 collision or Halo2 sound verification break.
- Target words: 220 words.
- Claims: None.
- Citations: None.

## 4.7 Zero-Knowledge MRV Circuit Construction
*Topic Sentence:* The verifiable MRV circuit compiles a quantized gradient-boosted decision tree ensemble into Halo2 arithmetic constraints over the BN254 scalar field.
- Key concepts: Quantized integer features; in-circuit inequality constraint $claimedAmount \le model(quantizedFeatures)$; `ezkl.poseidon_hash` feature binding; off-chain SHA-256 audit pointer.
- Target words: 200 words.
- Claims: [CLAIM: C-06: 4032 bytes proof size]; [CLAIM: C-07: 18007 bytes verifier initcode].
- Citations: TODOCITE: ezkl Halo2 zero-knowledge inference engine.

## 4.8 On-Chain Verification and Monotonic Batch Minting
*Topic Sentence:* Upon validating the Halo2 proof and asserting unspent issuance nullifiers, `CarbonRegistry.sol` mints ERC-1155 credit tokens assigned to a monotonically increasing serial batch ID.
- Key concepts: Monotonic serial batch IDs; registry treasury minting; event emission (`Issued`, `ProjectRegistered`, `Claimed`); gas-optimized verification execution.
- Target words: 160 words.
- Claims: [CLAIM: C-08: 643269 verify gas]; [CLAIM: C-20: 11323 bytes CarbonRegistry runtime size].
- Citations: None.
