# Revision Plan & Review Response Matrix

This document maps all 24 review comments from Reviewer 1 (Systems), Reviewer 2 (Cryptography), and Reviewer 3 (MRV) to concrete manuscript changes or formal rebuttal explanations. All modifications are implemented across manuscript sections 01–08, appendices, and tables while maintaining strict word count budgets (±10%), zero banned phrases, and full evidence map verification.

---

## Reviewer 1: Systems & Distributed Computing

| Comment | Type | Resolution / Action | Section & Text Modification |
| :--- | :--- | :--- | :--- |
| **R1-Maj-1** | Major | Clarify why a centralized consortium database (e.g., PostgreSQL with unique constraints) is insufficient in multi-jurisdictional voluntary carbon markets. | **Implemented in §2.2 & §3.1:** Added explicit analysis explaining that a centralized consortium database requires mutual trust in a single hosting entity, lacks non-repudiation, permits unilateral history rewriting, introduces jurisdictional sovereign capture, and creates a single point of failure. VeriCarbon's decentralized nullifier registry enforces cryptographic execution without custodial intermediaries. |
| **R1-Maj-2** | Major | Analyze Layer 2 sequencer centralization, transaction front-running, and Ethereum L1 force-inclusion. | **Implemented in §7.4:** Expanded discussion of optimistic sequencer risks, explaining that while a centralized sequencer could theoretically delay or reorder transactions, Ethereum L1 force-inclusion mechanisms allow registries to bypass a censoring sequencer. Furthermore, nullifiers are deterministic functions of $(g, v, \tau)$, so front-running yields no financial benefit to an unauthorized adversary. |
| **R1-Maj-3** | Major | Latency distribution shape ($N=20$) and public RPC rate-limiting behavior. | **Implemented in §6.4:** Added distributional metrics (standard deviation: $\pm 38.4\,\text{ms}$ for RPC roundtrip, $\pm 5.1\,\text{ms}$ for indexer lag) and noted that trials were executed with exponential backoff to eliminate public RPC rate-limiting artifacts. |
| **R1-Maj-4** | Major | Amortization of pairing verification via proof batching or recursive SNARKs. | **Implemented in §6.4 & §8.2:** Added discussion of multi-proof aggregation schemes (e.g., Halo2 batch verification or recursive SNARK trees), noting how aggregating $K$ parcel proofs into a single pairing check reduces per-parcel verification gas asymptotically to $\mathcal{O}(1/K)$. |
| **R1-Min-1** | Minor | State exact numerical delta for EIP-170 limit. | **Implemented in §5.2 & §6.2:** Explicitly noted that 18,007 bytes leaves an exact safety margin of 6,569 bytes below the 24,576-byte EIP-170 ceiling. |
| **R1-Min-2** | Minor | Micro-reorg handling in PostgreSQL indexer. | **Implemented in §5.3:** Clarified that the indexer daemon tracks block confirmation depth (2 blocks on Base) and employs transactional upserts keyed on `(tx_hash, log_index)` to ensure deterministic idempotency during micro-reorgs. |
| **R1-Min-3** | Minor | Lighthouse audit parameters. | **Implemented in §5.3:** Added specification of audit parameters (desktop simulation, production build, simulated 10 Gbps connection). |
| **R1-Min-4** | Minor | Figure 3 gas label clarity. | **Implemented in §6.4:** Verified caption and text clearly differentiate ZK pairing gas (73.7%) from ERC-1155 storage and dispatch logic. |

---

## Reviewer 2: Cryptography & Security

| Comment | Type | Resolution / Action | Section & Text Modification |
| :--- | :--- | :--- | :--- |
| **R2-Maj-1** | Major | Formal security binding between in-circuit Poseidon and off-chain SHA-256. | **Implemented in §4.7 & §6.5:** Formalized that Poseidon is collision-resistant over $\mathbb{F}_p$ of BN254. The off-chain SHA-256 hash in the signed IPFS bundle serves as an audit pointer; if an adversary manipulates the feature vector, the in-circuit Poseidon evaluation $\mathcal{H}_{\text{poseidon}}(X)$ diverges from `instances[1]`, causing verification to fail. |
| **R2-Maj-2** | Major | Soundness of negative return value in Where node (BN254 scalar field wrap-around). | **Implemented in §4.7:** Clarified that in the scalar field $\mathbb{F}_p$, $-1 \equiv p-1$. On-chain, `CarbonRegistry.issue` asserts that the public instance `instances[2]` strictly equals the requested `calldata uint256 amount`. Because the adversary requested $m \ll p-1$ (e.g., 644 credits), the contract comparison $amount == instances[2]$ evaluates $644 == p-1 \implies \text{false}$, causing an atomic revert. Field wrap-around cannot satisfy the equality check. |
| **R2-Maj-3** | Major | Byzantine registry independence in Lemma 1. | **Implemented in §4.6:** Reinforced Lemma 1 narrative, proving that the unicity guarantee holds even when Registry B is Byzantine or actively colluding with the project developer, because $\mathcal{N}_{\text{iss}} := \text{keccak256}(g, v, \tau)$ contains zero registry-specific state. |
| **R2-Maj-4** | Major | Delineation between pre-issuance speculative privacy and post-issuance public unicity. | **Implemented in §4.2 & §4.3:** Clarified that Definition 1 protects landholder privacy exclusively during pre-issuance project registration; upon formal credit issuance, the geohash8 centroid $g$ is disclosed to the public settlement layer to enforce cross-registry deduplication. |
| **R2-Min-1** | Minor | Clarify standard `abi.encode` padding in Definitions 1–3. | **Implemented in §4.2, §4.3, §4.5:** Explicitly stated that standard `abi.encode` pads inputs to 32-byte boundaries, eliminating hash collision risks inherent in `abi.encodePacked`. |
| **R2-Min-2** | Minor | Cite KZG ceremony parameters and lack of toxic waste. | **Implemented in §5.2:** Cited Ethereum/Hermez KZG ceremony ($2^{13}$ evaluation degree), referencing trusted setup non-collusion properties. |
| **R2-Min-3** | Minor | Claim nullifier construction rationale. | **Implemented in §4.5:** Clarified that incorporating `claimant` address and `beneficiaryCommitment` prevents third-party replay or front-running of retirement certificates. |
| **R2-Min-4** | Minor | Link formal lemmas to Foundry invariant test signatures. | **Implemented in §6.3:** Explicitly cited `invariant_NoClaimNullifierRecordedTwice` and `invariant_TotalRetiredNeverExceedsTotalIssued`. |

---

## Reviewer 3: Remote Sensing & Environmental Accounting

| Comment | Type | Resolution / Action | Section & Text Modification |
| :--- | :--- | :--- | :--- |
| **R3-Maj-1** | Major | Operationalizing pipeline with National Forest Inventory (NFI) & spaceborne LiDAR data. | **Implemented in §6.1 & §7.3:** Detailed the exact operational pathway for real-world deployment: pairing GEDI L4A footprint waveforms with destructive harvest ground plots from national forest inventories, while emphasizing that ZK verification guarantees arithmetic execution regardless of label source. |
| **R3-Maj-2** | Major | Clarify spatial-block cross-validation rationale. | **Implemented in §5.1 & §6.1:** Emphasized that spatial-block quadrant clustering was specifically designed to prevent spatial autocorrelation leakage (Tobler's First Law) between training and evaluation chips. |
| **R3-Maj-3** | Major | Cite IPCC 2006 Guidelines and define ecological carbon pool boundaries (AGB only). | **Implemented in §4.7 & §7.3:** Cited *IPCC 2006 Guidelines for National Greenhouse Gas Inventories (Volume 4: AFOLU)* for $CF=0.47$ and $44/12$. Formally declared that VeriCarbon models *Aboveground Biomass (AGB)* only; below-ground biomass, soil organic carbon, and dead wood are excluded from satellite optical inference. |
| **R3-Maj-4** | Major | Governance and whitelisting of the on-chain `modelHash`. | **Implemented in §3.1 & §4.7:** Specified that `modelHash` is registered and immutable in `CarbonRegistry.sol`, controlled by governance/multi-sig, preventing rogue registries or developers from substituting self-biased models. |
| **R3-Min-1** | Minor | Sentinel-2 constellation specifications (2A/2B 5-day revisit). | **Implemented in §2.1 & §5.1:** Added technical specifications of Sentinel-2 twin constellation (2A/2B) and 5-day equatorial revisit frequency. |
| **R3-Min-2** | Minor | Optical cloud occlusion and SAR fusion (Sentinel-1). | **Implemented in §7.2:** Added discussion of C-band synthetic aperture radar (Sentinel-1) fusion to penetrate persistent tropical cloud cover. |
| **R3-Min-3** | Minor | Unit nomenclature consistency. | **Implemented across §4.7, §5.1, §6.1:** Strictly differentiated biomass density ($\text{Mg}/\text{ha}$) from carbon credits ($1\,\text{credit} = 1\,\text{tCO}_2\text{e}$). |
| **R3-Min-4** | Minor | Baseline comparison caption in Table 1. | **Implemented in `paper/tables/related_work_matrix.md`:** Clarified that prior decentralized registries operate exclusively as token bridges without computational verification. |

