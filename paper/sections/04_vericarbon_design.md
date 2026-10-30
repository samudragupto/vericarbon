# Section 4: VeriCarbon Design

## 4.1 Layered Architectural Decomposition

VeriCarbon resolves the computational dichotomy between high-dimensional Earth observation analytics and decentralized consensus through a three-tier architecture:
1. **Tier 1 (Off-Chain Remote Sensing Ingestion):** Ingests spaceborne multispectral reflectance rasters (Sentinel-2 L2A optical and red-edge bands) and categorical land-cover tiles (ESA WorldCover), extracting quantized feature vectors across spatial blocks while preserving raw raster privacy.
2. **Tier 2 (Client-Side Zero-Knowledge Proving Engine):** Compiles an integer-quantized decision tree regressor into an arithmetic Halo2 circuit via `ezkl`. A developer generates a succinct proof asserting that claimed credits are bounded by model inference ($amount \le f_{model}(X)$).
3. **Tier 3 (On-Chain Settlement & Nullifier Layer):** Deployed as modular smart contracts on Base Sepolia (`Halo2Verifier.sol`, `CarbonRegistry.sol`). The registry executes pairing checks, enforces salt-independent geospatial unicity nullifiers across competing registries, mints ERC-1155 tokens, and records non-fungible retirement claim nullifiers.

## 4.2 Definition 1: Geospatial Commitment & Landholder Privacy

To protect commercial landholder confidentiality prior to formal credit issuance—preventing predatory land speculation or unauthorized timber reconnaissance—project developers register parcels using a cryptographic commitment:

> **Definition 1 (Geospatial Commitment).** Let $g \in \Sigma^8$ denote a canonical 8-character base-32 geohash string ($\text{geohash8}$, corresponding to an approximately $38.2\,\text{m} \times 19.1\,\text{m}$ bounding box centroid), and let $s \in \{0,1\}^{256}$ denote a cryptographically secure, client-generated 32-byte blinding salt. The geospatial commitment $\mathcal{C}_{\text{geo}} \in \{0,1\}^{256}$ is defined as:
> $$\mathcal{C}_{\text{geo}} := \mathcal{H}_{\text{keccak}}(\text{abi.encode}(g, s))$$
> where $\text{abi.encode}$ denotes standard Solidity serialization with strict 32-byte word padding, preventing length-extension collisions inherent to non-padded concatenation (`abi.encodePacked`).

During project onboarding, the registry operator invokes `registerProject(projectId, geoCommitment, evidenceCid)`, recording $\mathcal{C}_{\text{geo}}$ alongside an IPFS content identifier $\text{CID}$ containing the signed project documentation. Crucially, Definition 1 provides **pre-issuance speculative privacy**: the blinding salt $s$ hides the precise physical location and boundaries during early project development, preventing hostile land speculation or predatory logging. At formal credit issuance, the landholder selectively discloses $g$ and $s$ to the settlement layer to enforce public parcel unicity.

## 4.3 Definition 2: Salt-Independent Global Issuance Nullifier (Amendment A0)

When credits are formally issued, the protocol must guarantee that no duplicate credits can be minted against the same parcel, vintage, and credit type, regardless of which registry processes the transaction:

> **Definition 2 (Global Issuance Nullifier).** Let $g \in \Sigma^8$ be the committed parcel geohash8, let $v \in [2000, Y_{\text{current}}]$ be a 16-bit integer denoting the Gregorian calendar vintage year, and let $\tau \in \{\text{REMOVAL}, \text{REDUCTION}\}$ be the credit type enumeration ($\text{REMOVAL} = 0, \text{REDUCTION} = 1$). The global issuance nullifier $\mathcal{N}_{\text{iss}} \in \{0,1\}^{256}$ is defined as:
> $$\mathcal{N}_{\text{iss}} := \mathcal{H}_{\text{keccak}}(\text{abi.encode}(g, v, \tau))$$

Crucially, under Amendment A0, the issuance nullifier $\mathcal{N}_{\text{iss}}$ deliberately **omits** the blinding salt $s$, the local `projectId`, and the calling registry address `msg.sender`. The contract asserts that:
$$\mathcal{H}_{\text{keccak}}(\text{abi.encode}(g, s)) = \text{projects}[projectId].geoCommitment$$
and subsequently checks:
$$\text{require}(!\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}}], \text{IssuanceNullifierAlreadySpent})$$
Once verified, $\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}}]$ is set to `true`, permanently closing the spatial-temporal window for that parcel across all participating registries on the network. The privacy provided by $s$ at registration transitions into public spatial unicity at issuance.

## 4.4 The Salt-Dodge Vulnerability Narrative (Hole A & Hole B Discovery)

The formulation of Definition 2 is a direct consequence of a security audit during prototyping. In pre-A0 protocol versions (retained for empirical testing in `PreA0CarbonRegistry.sol`), the issuance nullifier was derived as:
$$\mathcal{N}_{\text{pre-A0}} := \mathcal{H}_{\text{keccak}}(\text{abi.encode}(projectId, vintageYear, creditType)) \quad \text{or} \quad \mathcal{H}_{\text{keccak}}(\text{abi.encode}(\mathcal{C}_{\text{geo}}, vintageYear, creditType))$$

This legacy formulation introduced two systemic vulnerabilities:
1. **Hole A (The Salt-Dodge Attack):** Because $\mathcal{C}_{\text{geo}}$ depends on the blinding salt $s$, an adversary controlling parcel $g$ could pick distinct salts $s_1 \neq s_2$, yielding distinct commitments $\mathcal{C}_{\text{geo},1} \neq \mathcal{C}_{\text{geo},2}$. The attacker registers Project 1 with $(g, s_1)$ and Project 2 with $(g, s_2)$ under competing registries. When issuing credits, distinct nullifiers $\mathcal{N}_1 \neq \mathcal{N}_2$ were computed, allowing both issuances to succeed on the same parcel. We proved this attack in Foundry via `test_HoleA_SaltDodge()`, confirming 1,088 credits [C-16, baseline_double_issuance_receipt.json] were minted against a single 544 $\text{tCO}_2\text{e}$ tract.
2. **Hole B (Vintage String Relabeling):** In legacy registries, unconstrained vintage strings allowed an adversary to issue credits for `"2024-A"`, and re-issue for `"2024-B"` or future years (`"2035"`), circumventing duplicate checks (`test_HoleB_VintageRelabel()`).

Amendment A0 mitigates both vulnerabilities. By requiring $g$ and $s$ as explicit calldata during `issue()`, asserting $\mathcal{H}(g, s) == \mathcal{C}_{\text{geo}}$, and hashing $g$ directly into $\mathcal{N}_{\text{iss}}$, the salt cannot dodge nullification. Subsequent issuances for parcel $g$ in vintage $v$ collide on $\mathcal{N}_{\text{iss}}$ and revert, regardless of salt. Furthermore, vintage years are constrained to $2000 \le v \le Y_{\text{current}}$ derived from `block.timestamp`.

## 4.5 Definition 3: Single-Claim Retirement Nullifier

When an enterprise purchaser retires carbon credits to compensate for corporate emissions, the protocol must guarantee that the retirement cannot be claimed multiple times:

> **Definition 3 (Single-Claim Retirement Nullifier).** Let $\mathcal{N}_{\text{iss}}$ be the issuance nullifier of the target credit batch, let $a \in \mathbb{A}$ be the Ethereum address of the claimant, let $k \in \mathbb{N}$ denote the claim type (e.g., Scope 1, Scope 2, Scope 3 compliance), and let $b \in \{0,1\}^{256}$ denote a cryptographic commitment to the corporate beneficiary identity. The claim nullifier $\mathcal{N}_{\text{claim}} \in \{0,1\}^{256}$ is defined as:
> $$\mathcal{N}_{\text{claim}} := \mathcal{H}_{\text{keccak}}(\text{abi.encode}(\mathcal{N}_{\text{iss}}, a, k, b))$$

Executing `retire(serialIds[], claimType, beneficiaryCommitment)` burns the corresponding ERC-1155 token quantity, asserts that $!\text{claimNullifierSpent}[\mathcal{N}_{\text{claim}}]$, sets the entry to `true`, and emits the `Claimed` event. Binding the claimant address $a$ and beneficiary commitment $b$ directly into $\mathcal{N}_{\text{claim}}$ ensures that third-party front-runners cannot intercept or claim another entity's retirement certificate, while permanently preventing duplicate corporate accounting replays across independent audit jurisdictions.

## 4.6 Lemma 1: Cross-Registry Issuance Unicity and Formal Proof

We formalize the unicity guarantee of Amendment A0 in Lemma 1:

> **Lemma 1 (Cross-Registry Issuance Unicity).** Assume the collision resistance of $\mathcal{H}_{\text{keccak}}$ (Assumption 1) and the knowledge soundness of the Halo2 verifier (Assumption 2). Let $\mathcal{R}_A$ and $\mathcal{R}_B$ be two distinct registries participating on the same L2 ledger, where $\mathcal{R}_B$ may be fully Byzantine or colluding with an adversary. It is computationally infeasible for $\mathcal{R}_A$ and $\mathcal{R}_B$ to both execute successful issuance transactions for the same spatial parcel $g$, vintage year $v$, and credit type $\tau$.

*Proof by Contradiction.* Suppose an adversary $\mathcal{M}$ successfully issues credits through registry $\mathcal{R}_A$ in transaction $T_A$ at block height $h_A$, and subsequently issues credits for the same parcel through registry $\mathcal{R}_B$ in transaction $T_B$ at block height $h_B \ge h_A$.

By Definition 2, transaction $T_A$ provides valid calldata $(P_A, g, s_A, v, \tau, m_A, D_A, \pi_A)$. Execution of `issue()` verifies $\mathcal{H}_{\text{keccak}}(g, s_A) = \text{projects}[P_A].geoCommitment$, validates proof $\pi_A$ via `Halo2Verifier.sol`, computes $\mathcal{N}_{\text{iss}, A} = \mathcal{H}_{\text{keccak}}(\text{abi.encode}(g, v, \tau))$, confirms $\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}, A}] == \text{false}$, and sets:
$$\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}, A}] \leftarrow \text{true}$$

Now consider transaction $T_B$, which submits $(P_B, g', s_B, v', \tau', m_B, D_B, \pi_B)$. For $T_B$ to represent double-issuance on the same physical plot, vintage, and type, we must have $g' = g$, $v' = v$, and $\tau' = \tau$. 

The contract computes the issuance nullifier for $T_B$:
$$\mathcal{N}_{\text{iss}, B} = \mathcal{H}_{\text{keccak}}(\text{abi.encode}(g', v', \tau')) = \mathcal{H}_{\text{keccak}}(\text{abi.encode}(g, v, \tau))$$

Because $\mathcal{H}_{\text{keccak}}$ is a deterministic function, the preimage inputs $(g, v, \tau)$ are identical to those in $T_A$, implying $\mathcal{N}_{\text{iss}, B} = \mathcal{N}_{\text{iss}, A}$.

Before minting tokens, $T_B$ evaluates:
$$\text{require}(!\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}, B}], \text{IssuanceNullifierAlreadySpent})$$

Since $\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}, A}]$ was set to `true` in block $h_A \le h_B$, and because the EVM state transition function preserves storage between non-reverting transactions, the condition $!\text{issuanceNullifierSpent}[\mathcal{N}_{\text{iss}, B}]$ evaluates to `false`. 

Therefore, for $T_B$ to succeed without reverting, $\mathcal{M}$ must either:
1. Find distinct preimages $(g', v', \tau') \neq (g, v, \tau)$ such that $\mathcal{H}_{\text{keccak}}(g', v', \tau') = \mathcal{H}_{\text{keccak}}(g, v, \tau)$, directly violating the collision resistance of $\mathcal{H}_{\text{keccak}}$ (Assumption 1); or
2. Produce an invalid state write altering storage without executing the contract logic, violating L2 state machine integrity (Assumption 4).

Because both cases occur with negligible probability, $T_B$ must revert. Thus, cross-registry duplicate issuance on the same parcel is impossible. $\blacksquare$

## 4.7 Zero-Knowledge MRV Circuit Construction

The verifiable MRV computational graph is compiled into an arithmetic Halo2 circuit using `ezkl v23.0.5`. Spaceborne observations (Sentinel-2 bands B02, B03, B04, B08, B11, B12, vegetation indices NDVI, NDRE, RECI, IRECI, and the discrete ESA WorldCover classification) represent continuous floating-point quantities. To execute these non-linear computations inside an algebraic finite field without floating-point emulation overhead, VeriCarbon applies uniform fixed-point integer quantization at scale factor $S = 2^7$ (scale multiplier 128), derived from empirical quantile calibration during model training. Continuous split boundaries within the gradient-boosted decision trees and leaf prediction weights are pre-compiled into integer inequality lookup tables, with division and scaling calibrated to prevent overflow in the BN254 scalar field ($\approx 254$ bits).

Furthermore, the allometric biomass-to-credit conversion is encoded directly within the computation graph, adhering strictly to the *IPCC 2006 Guidelines for National Greenhouse Gas Inventories (Volume 4: Agriculture, Forestry and Other Land Use)*. The circuit models Aboveground Biomass (AGB) density exclusively; Below-Ground Biomass (BGB), soil organic carbon, and litter are omitted as they cannot be directly observed from spaceborne optical rasters. The circuit multiplies the predicted Aboveground Biomass density ($\text{Mg}/\text{ha}$) by the physical area of the geohash8 centroid parcel ($A \approx 0.073\,\text{ha}$), the canonical IPCC carbon fraction constant ($CF = 0.47$), and the stoichiometric carbon-to-dioxide molecular weight ratio ($44/12 \approx 3.667$), scaling the result to discrete integer metric tons of sequestered carbon dioxide equivalent ($1\,\text{credit} = 1\,\text{tCO}_2\text{e}$).

The private witness vector consists of the 12 quantized remote sensing features $X \in \mathbb{Z}^{12}$ and the claimed credit amount $m \in \mathbb{Z}$. The public instance array exposes three 256-bit scalar elements:
1. **`instances[0]` (`modelHash`):** A fixed constant representing the SHA-256 digest of the committed ONNX decision tree graph, permanently baked into the verification key $\text{vk}$ and verified against the on-chain registry whitelist.
2. **`instances[1]` (`dataCommitment`):** An in-circuit arithmetic feature commitment bound via $\mathcal{H}_{\text{poseidon}}(X)$. Because Poseidon provides provable collision resistance over the prime-order scalar field $\mathbb{F}_p$ of BN254, an adversary cannot find alternate features yielding an identical commitment. By employing Poseidon hashing in-circuit, VeriCarbon avoids the prohibitive constraint overhead of bitwise SHA-256 (>50,000 lookup rows), while the full SHA-256 digest of the raw feature vector is pinned in the IPFS evidence bundle as an off-chain audit pointer.
3. **`instances[2]` (`claimedAmount`):** The output of an in-circuit conditional node:
$$\text{claimedAmount} = \text{Where}(m \le f_{\text{model}}(X), m, -1)$$
In the scalar field $\mathbb{F}_p$ ($p \approx 2^{254}$), $-1$ is arithmetically represented as $p-1$. On-chain, `CarbonRegistry.issue()` enforces that the public instance `instances[2]` strictly equals the requested `amount` parameter from calldata (`require(claimedAmount == instances[2])`). If an adversary attempts amount inflation ($m > f_{\text{model}}(X)$), the circuit evaluates to $p-1$. Because the adversary requested $m \ll p-1$ (e.g., $m = 644$ credits), the contract comparison $644 == p-1$ evaluates to `false`, causing the transaction to revert atomically with `InvalidZKProof`. Field wrap-around cannot satisfy the equality check. The generated proof $\pi$ is exactly 4,032 bytes [C-06, zk_benchmarks.json].

## 4.8 On-Chain Verification and Monotonic Batch Minting

Upon receiving an issuance transaction, `CarbonRegistry.sol` delegates proof validation to `Halo2Verifier.sol` [C-07, manifest.json], which occupies 18,007 bytes of initcode (runtime size: 11,323 bytes [C-20, manifest.json]). The verifier evaluates KZG multi-point pairing operations consuming 643,269 gas [C-08, zk_benchmarks.json]. Upon successful verification, the registry increments an internal monotonic batch counter $\text{totalBatches} \leftarrow \text{totalBatches} + 1$, mints $m$ ERC-1155 tokens to the registry treasury under token ID $\text{serialId} = \text{totalBatches}$, and emits the `Issued` event containing the permanent $\mathcal{N}_{\text{iss}}$ identifier.
