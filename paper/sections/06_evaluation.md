# Section 6: Evaluation
\label{sec:evaluation}

## 6.1 Experimental Setup & Data Pipeline Validation

We evaluate VeriCarbon empirically across four foundational research questions: proving feasibility on commodity hardware (RQ1), security against collusive Byzantine registries (RQ2), economic gas overhead and off-chain latency (RQ3), and the privacy-auditability trade-off (RQ4). All benchmarks are executed deterministically under fixed random seed `SEED = 42` on a consumer laptop workstation (Lenovo LOQ 15APH8) equipped with an AMD Ryzen 7 7840HS w/ Radeon 780M Graphics processor (8 physical cores, 16 logical threads), 16.0 GB of installed RAM (15.19 GB usable), running Microsoft Windows 11 Home Single Language (build 10.0.26200) and Python 3.11.9. Proving and verification run entirely on CPU; the discrete GPU (NVIDIA GeForce RTX 4060 Laptop GPU, 8.0 GB VRAM) was not used in any measured path. On-chain contracts are tested against a local Cancun EVM Anvil node and deployed to the public Base Sepolia testnet (Chain ID 84532).

Before examining quantitative model performance, we must explicitly disclose the provenance and limitation of the ground-truth biomass labels. While Microsoft Planetary Computer hosts cloud-free Sentinel-2 L2A optical rasters and ESA WorldCover land-cover rasters without authentication barriers, spaceborne LiDAR biomass datasets (e.g., GEDI L4A, requiring NASA Earthdata authentication; ESA CCI Biomass, unindexed on public STAC) are not frictionlessly accessible. Consequently, in strict compliance with the reproducible protocol specification, pixel-level Aboveground Biomass labels ($\text{agb\_mg\_ha}$) were synthesized deterministically from allometric canopy height and density equations calibrated to tropical forest literature, as logged in `docs/REPRODUCIBILITY.md`. Therefore, all cross-validation metrics presented in this section evaluate **internal pipeline self-consistency on synthesized fixtures — NOT a field-accuracy claim**. In an operational production deployment, these training targets would be superseded by authenticated GEDI L4A footprint waveforms calibrated against in-situ National Forest Inventory (NFI) destructive harvest plots. Crucially, the zero-knowledge verification mechanisms proven herein remain strictly invariant to training label provenance.

\input{tables/model_metrics.md}

We evaluate the `HistGradientBoostingRegressor` ($max\_iter = 40, max\_depth = 4, lr = 0.1, min\_samples\_leaf = 8$) across four spatial-block clusters defined by the four intersecting geohash-5 cells (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`) spanning the 1.05 km $\times$ 1.05 km Tapajós test chip. Across the 4-fold spatial-block cross-validation sweep, the model achieved an aggregate Mean Absolute Error of 5.2901 $\text{Mg}/\text{ha}$ ($\pm 4.7925$), a Root Mean Squared Error of 11.6196 $\text{Mg}/\text{ha}$ ($\pm 12.8367$), and an average coefficient of determination ($R^2$) of 0.8812 ($\pm 0.1091$). For the canonical holdout deployment (Fold 4, evaluated on unseen block `6z900`), the model achieved an MAE of 3.7514 $\text{Mg}/\text{ha}$, an RMSE of 8.1675 $\text{Mg}/\text{ha}$, and an $R^2$ score of 0.9869.

## 6.2 RQ1: ZK Proving Feasibility & Verifier Overhead

To answer RQ1—whether zero-knowledge proofs over remote sensing models can be generated and verified at practical laptop and EVM costs—we conducted a comprehensive circuit complexity sweep across feature dimensions $F \in \{8, 12, 16, 32\}$ and ensemble tree counts $T \in \{2, 4, 8\}$ at constant tree depth $D = 2$ and $\text{logrows} = 13$.

\input{tables/zk_benchmarks.md}

As presented in \autoref{tab:zk_benchmarks} and visualized in \autoref{fig:proving_time}, client-side proving latency remains remarkably compact across all evaluated configurations. For our canonical production circuit ($F = 12$ features, $T = 4$ decision trees, depth $D = 2$), the circuit setup and key generation phase completes in 0.7503 s, while witness assignment and Halo2 KZG proof generation on a commodity laptop CPU requires only 0.5634 s. Even when expanding the input feature space to 32 spectral dimensions and 8 ensemble trees ($T = 8$), proving time scales sub-linearly to 0.6263 s, easily executing within consumer hardware envelopes. Because decision tree inequalities are compiled into arithmetic lookup gates, circuit depth and column assignment fit comfortably within an evaluation degree of $\text{logrows} = 13$ ($2^{13} = 8,192$ rows). Peak memory consumption during proving remains under 512 MB, proving that field practitioners in remote forestry offices can generate cryptographic proofs without requiring cloud GPU clusters.

\begin{figure}[t]
\centering
\includegraphics[width=0.9\linewidth]{figures/proving_time.png}
\caption{Client-side Halo2 proving time on a laptop CPU across feature dimensions $F \in \{8, 12, 16, 32\}$ and ensemble trees $T \in \{2, 4, 8\}$. The canonical circuit configuration ($F=12, T=4$) achieves 0.56s proving latency.}
\label{fig:proving_time}
\end{figure}

Crucially, because Halo2 uses Kate-Zaverucha-Goldberg (KZG) polynomial commitments over the BN254 curve, the generated proof size is strictly invariant to circuit complexity. Across all ten evaluated parameterizations in \autoref{tab:zk_benchmarks}, the serialized proof payload $\pi$ remains exactly 4,032 bytes. Furthermore, off-chain proof verification completes between 9.74 ms and 11.10 ms across all configurations, confirming that decentralized peer nodes can rapidly validate incoming proofs during gossip validation.

On-chain verifiability is constrained by EVM execution limits, specifically EIP-170 (capping contract runtime bytecode size at 24,576 B) and EIP-3860 (capping contract initcode at 49,152 B). Compiling the contracts via `forge build --sizes` reveals that `Halo2Verifier.sol` features a runtime size of 17,978 B vs the EIP-170 limit of 24,576 B (a 6,598-byte margin) and an initcode size of 18,007 B vs the EIP-3860 limit of 49,152 B (a 31,145-byte margin), while `CarbonRegistry.sol` occupies runtime 11,323 B vs the EIP-170 limit of 24,576 B and initcode 12,283 B vs the EIP-3860 limit of 49,152 B. When executing on-chain verification inside `CarbonRegistry.issue()`, `Halo2Verifier.verifyProof()` consumes 643,269 gas. This demonstrates that ZK-SNARK verification of spaceborne ML models is fully feasible inside standard EVM gas limits.

## 6.3 RQ2: Security Evaluation & Byzantine Fraud Mitigation

To evaluate RQ2—whether the global nullifier architecture eliminates duplicate issuance and fraudulent over-allocation under mutually distrusting registries—we implemented an adversarial test suite evaluating seven distinct attack vectors (A1–A7), alongside the two pre-A0 vulnerability demonstrations and a centralized baseline demonstration.

\input{tables/fraud_results.md}

\autoref{tab:fraud_results} summarizes the security evaluation matrix\footnote{Attack-scenario gas measurements include Foundry test harness and setup overhead and are not directly comparable to production gas figures in \autoref{tab:gas_costs}.}: seven post-A0 attack vectors (A1–A7) revert on VeriCarbon; two pre-A0 vulnerabilities (Hole A, Hole B) and the centralized baseline are demonstrated succeeding by design. In VeriCarbon, every single attack attempt is intercepted on-chain by deterministic cryptographic constraints:
* **A1 (Cross-Registry Same Parcel):** When Registry B attempts to issue credits for parcel `6z900000` (vintage 2024, type REMOVAL) after Registry A has already issued, the transaction atomically reverts with `IssuanceNullifierAlreadySpent` (measured gas: 1,995,374).
* **A2 (Same-Registry Duplicate Issuance):** An operator re-submitting an already credited parcel under the same registry is blocked by the atomic `issuanceNullifierSpent` storage check (gas: 1,828,839).
* **A3 (Salt-Dodge Attack):** An adversary re-registering parcel `6z900000` with a fresh salt $s_2$ under Project 2 attempts to issue credits. Because Amendment A0 derives $\mathcal{N}_{\text{iss}} := \text{keccak256}(g, v, \tau)$ directly from the spatial geohash8 rather than the salted commitment, the transaction collides on $\mathcal{N}_{\text{iss}}$ and reverts with `IssuanceNullifierAlreadySpent` (gas: 1,996,439). This provides concrete empirical proof of the Amendment A0 security guarantee.
* **A4 (Retirement Claim Replay):** A corporate claimant attempting to replay an identical retirement claim against spent batch tokens is blocked by `claimNullifierSpent` (gas: 1,344,353).
* **A5 (Claim Against Non-Existent Batch):** Retirement calls targeting invalid batch IDs revert with `BatchDoesNotExist` (gas: 14,651).
* **A6 (Amount Inflation Above ZK Model Output):** A corrupt registry submitting calldata claiming 644 credits when the private remote sensing witness only justifies the fixture parcel's certified model output of 544 credits causes `Halo2Verifier.verifyProof()` to revert with `InvalidZKProof` (gas: 1,023,109).
* **A7 (Credit-Type Relabeling & Future Vintages):** Submitting future vintage years ($v > Y_{\text{current}}$) or invalid enum values reverts with `InvalidVintageYear` (gas: 521,468).

In stark contrast, evaluating the same attack scenarios against `BaselineCentralRegistry.sol`—a conventional centralized transfer-log registry lacking global nullifiers—demonstrates severe security failures. In our programmatic Foundry demonstration (`BaselineDoubleIssuance.s.sol`), Registry A and Registry B both successfully registered parcel `6z900000` and minted 544 credits each, inflating total supply to 1,088 credits (200\% of the fixture parcel's certified model output of 544 credits). Invariant testing across 512 state transitions via Foundry handlers further confirmed that total retired credits never exceed total issued credits (`invariant_TotalRetiredNeverExceedsTotalIssued`), and no claim nullifier is ever recorded twice (`invariant_NoClaimNullifierRecordedTwice`).

## 6.4 RQ3: Economic Cost Modeling & Latency Overhead

To assess RQ3—the economic feasibility of deploying zero-knowledge carbon registries on Layer 2 rollups versus Layer 1—we benchmarked execution gas consumption for all core registry operations using Foundry Cancun EVM execution.

\input{tables/gas_costs.md}

As detailed in \autoref{tab:gas_costs} and \autoref{fig:gas_comparison}, end-to-end credit issuance via `CarbonRegistry.issue()` consumes 873,164 gas. A component decomposition reveals that gas is dominated by in-circuit zero-knowledge pairing verification (643,269 gas, representing 73.7\% of total issuance cost), followed by ERC-1155 token minting and storage allocation (113,473 gas), protocol dispatch logic (92,922 gas), and nullifier mapping storage (23,500 gas).

\begin{figure}[t]
\centering
\includegraphics[width=0.9\linewidth]{figures/gas_comparison.png}
\caption{Economic comparison of VeriCarbon operations. (a) Issuance gas decomposition showing ZK verification dominance; (b) Modeled transaction costs comparing Base L2 vs. Ethereum L1.}
\label{fig:gas_comparison}
\end{figure}

To model transaction costs in fiat currency, we translate gas consumption under clearly labeled economic assumptions: an assumed ETH valuation of \$2,500.00, an Ethereum L1 gas price of 25.0 gwei, and a Base L2 execution gas price of 0.005 gwei combined with an amortized EIP-4844 blob data fee estimate of \$0.001 per transaction, as configured in `eval/gas_costs.py`. Under this model, executing an end-to-end issuance on Ethereum L1 costs \$54.57. On Base L2, the identical transaction costs only \$0.0119—achieving a 4,585-fold economic cost reduction. 

Similarly, secondary lifecycle registry operations exhibit massive cost savings on Layer 2 rollups. As detailed in \autoref{tab:gas_costs}, onboarding a new project via `registerProject` consumes 118,333 gas, translating to \$0.0025 on Base L2 versus \$7.40 on Ethereum L1. Retiring credits to compensate corporate carbon footprints (`retire`) consumes 74,121 gas, incurring \$0.0019 on Base L2 versus \$4.63 on L1. Partial fractional retirements (`retireAmounts`) consume 111,476 gas, incurring \$0.0024 on Base L2 versus \$6.97 on L1. Because issuance and retirement transactions cost fractions of a cent on Base L2, cryptographic verification overhead is economically viable even for smallholder community agroforestry projects generating modest credit volumes.

\input{tables/latency.md}

Off-chain network latency and indexing lag are summarized in \autoref{tab:latency} ($N=20$ trials, executed with exponential backoff to eliminate public RPC rate-limiting artifacts). Public Base Sepolia RPC roundtrip latency (`eth_blockNumber`) exhibits a mean of 499.77 ms, a median of 501.49 ms, and a p95 of 541.66 ms. The asynchronous event indexer ingests on-chain logs, decodes calldata, and upserts relational state into PostgreSQL with a mean ingestion latency of 10.57 ms, a median of 5.62 ms, and a p95 lag of 28.53 ms. This sub-second synchronization latency demonstrates that decentralized nullifiers do not introduce unacceptable UX delays for carbon market participants.

## 6.5 RQ4: Privacy vs. Auditability Trade-Off

Finally, addressing RQ4, VeriCarbon navigates the fundamental trade-off between commercial data confidentiality and public auditability through cryptographic commitments. 

In voluntary carbon forestry, commercial developers frequently refuse to disclose raw satellite rasters or boundary shapefiles due to predatory timber poaching and land-grabbing risks. By proving inference in zero knowledge, VeriCarbon allows developers to keep multispectral rasters completely private. Commercial parcel boundaries are protected at registration via Definition 1 ($\mathcal{C}_{\text{geo}} = \mathcal{H}(g, s)$); third parties observing on-chain registration logs observe only pseudorandom 32-byte hashes.

Simultaneously, public auditability is preserved through two complementary mechanisms. First, the private input feature vector is cryptographically bound inside the Halo2 circuit via `ezkl.poseidon_hash`, guaranteeing that the prover cannot evaluate the circuit on arbitrary dummy data. Second, the full 32-byte SHA-256 digest of the canonical quantized feature vector is pinned to IPFS within the evidence bundle, alongside STAC scene metadata and summary statistics. When an auditor or regulatory observer conducts an audit, they retrieve the IPFS bundle via its immutable content identifier, extract the STAC scene timestamps, and re-query the public Microsoft Planetary Computer catalog. The auditor can re-extract spectral features, verify the off-chain SHA-256 digest, and recompute the Poseidon feature hash, confirming exact mathematical concordance with the on-chain `dataCommitment` instance without requiring expensive bitwise SHA-256 constraints to execute inside the ZK-SNARK circuit.
