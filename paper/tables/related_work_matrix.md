# Table: Architectural Comparison with Related Carbon Systems and dMRV Proposals

Comparison of VeriCarbon against operational Web3 carbon protocols, decentralized MRV platforms, and academic cryptographic carbon accounting proposals.

| System / Scheme | Domain | Off-chain data verified? | In-circuit ML? | Cross-registry double-issuance defense | Double-retirement defense | Public plot privacy | Verified Source |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Toucan Protocol** | Web3 Carbon Bridge | No (assumes paper validity) | No | None (isolated registry bridge) | ERC-20 burn (no nullifier) | None (public project metadata) | Toucan Protocol (2022) |
| **KlimaDAO** | Carbon-Backed Currency | No (pools external bridged tokens) | No | None (inherits bridge flaws) | Token bonding / burn | None | KlimaDAO (2022) |
| **Chia Climate Warehouse** | World Bank Meta-Registry | No (aggregates external API logs) | No | Passive off-chain observer only | Bilateral messaging | None (plain coordinate data) | World Bank Group (2022) |
| **dMRV Proposal (Mohan et al.)** | IoT & Remote Sensing dMRV | Oracle signatures (TLS-Notary) | No | None | Smart contract burn | Plaintext GIS polygons | Applied Energy (2023) |
| **dMRV Proposal (Franke et al.)** | Blockchain Carbon Accounting | External verification body API | No | None (national silo) | Token burn | Plaintext coordinates | Env. Res. Lett. (2022) |
| **VeriCarbon** | Verifiable Satellite MRV | **Yes: Poseidon binding (SHA-256 off-circuit pointer)** | **Yes: compact decision tree (not deep net)** | **Cryptographic (Salt-independent geohash8 nullifier)** | **Global Claim Nullifier (ERC-1155 burn)** | **Geohash8 salted commitment** | **This work** |

> [!NOTE]
> *Comparative Architectural Scope:* Prior operational Web3 carbon protocols (e.g., Toucan, KlimaDAO) operate strictly on secondary token logistics and transfer bridges, treating off-chain certification as trusted ground truth without executing algorithmic computational verification. In contrast, VeriCarbon enforces algorithmic computational verification directly on-chain via zero-knowledge proofs while cryptographically preventing cross-registry duplicate issuance through global nullifiers. VeriCarbon's in-circuit machine learning model is restricted to a compact gradient-boosted decision tree ensemble ($F=12, T=4, D=2$) proved in Halo2/KZG rather than a deep convolutional neural network. In-circuit feature commitments leverage arithmetic `ezkl.poseidon_hash` binding while the full SHA-256 hash remains an off-chain IPFS audit pointer. Commercial landholder boundary privacy is enforced at `geohash8` granularity (~38.2m × ~19.1m) via salted Keccak-256 commitments.
