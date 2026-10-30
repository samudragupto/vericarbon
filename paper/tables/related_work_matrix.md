# Table: Architectural Comparison with Related Carbon Systems and dMRV Proposals

Comparison of VeriCarbon against operational Web3 carbon protocols, decentralized MRV platforms, and academic cryptographic carbon accounting proposals.

| System / Scheme | Domain | Off-chain data verified? | In-circuit ML? | Cross-registry double-issuance defense | Double-retirement defense | Public plot privacy | Venue / Year |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Toucan Protocol** | Web3 Carbon Bridge | No (assumes Verra paper validity) | No | None (isolated registry bridge) | ERC-20 burn (no nullifier) | None (public project metadata) | Industry (2021) |
| **KlimaDAO** | Carbon-Backed Currency | No (pools external bridged tokens) | No | None (inherits bridge flaws) | Token bonding / burn | None | Industry (2021) |
| **Flowcarbon** | Tokenized Carbon Offsets | No (permissioned off-chain custodian) | No | None (custodial trust) | Token burn | None | Industry (2022) |
| **Chia Climate Warehouse** | World Bank Meta-Registry | No (aggregates external API logs) | No | Passive off-chain observer only | Bilateral messaging | None (plain coordinate data) | World Bank (2022) |
| **Regen Network** | Ecological Ledger | Oracle-attested (trusted signers) | No | None (independent Cosmos state) | On-chain credit retirement | Plaintext geojson | Industry (2021) |
| **Open Forest Protocol** | Decentralized Forest MRV | Multi-validator stake consensus | No | None (independent NEAR state) | State burn | Public boundary coordinates | Industry (2022) |
| **dMRV Proposal (Mohan et al.)** | IoT & Remote Sensing dMRV | Oracle signatures (TLS-Notary) | No | None | Smart contract burn | Plaintext GIS polygons | Applied Energy (2023) |
| **dMRV Proposal (Franke et al.)** | Blockchain Carbon Accounting | External verification body API | No | None (national silo) | Token burn | Plaintext coordinates | Env. Res. Lett. (2022) |
| **dMRV Proposal (VanderBurg et al.)** | Satellite Forest Verification | Centralized cloud pipeline | No | None | Registry state | Semi-private hash | IEEE Access (2023) |
| **ZK-Credit Scheme (Kang et al.)** | Verifiable Energy Offsets | Merkle root over smart meter logs | Linear model | Intra-protocol only | Nullifier set | Account-level blinding | Workshop (2023) |
| **ZK-Credit Scheme (Zhang et al.)** | Private Carbon Footprint | Zero-knowledge supply-chain input | Linear / MLP | Intra-protocol only | Nonce check | Private balance | IEEE S&P (2022) |
| **VeriCarbon (This Work)** | Verifiable Satellite MRV | **Yes: Poseidon binding (SHA-256 off-circuit pointer)** | **Yes: compact decision tree (not deep net)** | **Cryptographic (Salt-independent geohash8 nullifier)** | **Global Claim Nullifier (ERC-1155 burn)** | **Geohash8 salted commitment** | **FGCS (2026)** |

> [!NOTE]
> *Comparative Architectural Scope:* Prior operational Web3 carbon protocols (e.g., Toucan, KlimaDAO, Flowcarbon) operate strictly on secondary token logistics and transfer bridges, treating off-chain certification as trusted ground truth without executing algorithmic computational verification. In contrast, VeriCarbon enforces algorithmic computational verification directly on-chain via zero-knowledge proofs while cryptographically preventing cross-registry duplicate issuance through global nullifiers. VeriCarbon's in-circuit machine learning model is restricted to a compact gradient-boosted decision tree ensemble ($F=12, T=4, D=2$) proved in Halo2/KZG rather than a deep convolutional neural network. In-circuit feature commitments leverage arithmetic `ezkl.poseidon_hash` binding while the full SHA-256 hash remains an off-chain IPFS audit pointer. Commercial landholder boundary privacy is enforced at `geohash8` granularity (~38.2m × ~19.1m) via salted Keccak-256 commitments.

