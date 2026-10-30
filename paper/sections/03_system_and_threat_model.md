# Section 3: System & Threat Model (Word Budget: 1,100 words)

## 3.1 Network Participants and Protocol Roles
*Topic Sentence:* The VeriCarbon network comprises five distinct participant classes: Project Developers, Independent MRV Auditors, Competing Registry Operators, Off-Chain Verifiers/Indexers, and Credit Buyers/Retirers.
- Key concepts: Role separation via OpenZeppelin AccessControl (`DEFAULT_ADMIN`, `REGISTRY_ROLE`); decentralized ecosystem of competing registries sharing a common EVM nullifier layer.
- Target words: 220 words.
- Claims: None.
- Citations: None.

## 3.2 Formal Cryptographic Assumptions
*Topic Sentence:* Protocol soundness rests upon three standard cryptographic assumptions: the collision resistance of Keccak-256 and Poseidon hash functions, the discrete logarithm / KZG polynomial commitment hardness over the BN254 elliptic curve, and existence of a tamper-evident decentralized storage network.
- Key concepts: Hardness assumptions A1–A4; random oracle model for Fiat-Shamir heuristic; IPFS content-addressed immutability.
- Target words: 220 words.
- Claims: None.
- Citations: TODOCITE: Kate 2010 KZG polynomial commitments; TODOCITE: Grassi 2021 Poseidon hash function.

## 3.3 Byzantine Adversary Capabilities
*Topic Sentence:* We model a Byzantine adversary capable of colluding with registry operators, manipulating off-chain evidence bundles, re-registering land with differing cryptographic salts, and forging retirement claims.
- Key concepts: Adversary controls registry signing keys; adversary attempts amount inflation; adversary attempts cross-registry double minting; adversary attempts vintage relabeling.
- Target words: 240 words.
- Claims: [CLAIM: C-15: 9 security attacks evaluated].
- Citations: None.

## 3.4 Cryptographically Enforced Security Guarantees
*Topic Sentence:* VeriCarbon cryptographically guarantees: (1) Over-crediting prevention; (2) Cross-registry double issuance unicity; (3) Salt-dodge invariance (Amendment A0); and (4) Double-claiming retirement nullification.
- Key concepts: In-circuit Halo2 bound $amount \le f_{model}(X)$; salt-independent nullifier $keccak256(geohash8, vintageYear, creditType)$; atomic state transitions in `CarbonRegistry.sol`.
- Target words: 220 words.
- Claims: [CLAIM: C-15: 9 security attacks evaluated].
- Citations: None.

## 3.5 System Non-Guarantees and Trust Boundaries
*Topic Sentence:* Crucially, VeriCarbon does NOT defend against physical-layer satellite sensor spoofing, upstream ESA tile corruption, or distribution shift when models trained on Amazon rainforests are applied to uncalibrated biomes.
- Key concepts: Explicit limitation honesty; sensor spoofing vulnerability; uncalibrated biomes / epistemic uncertainty; bilateral off-chain misrepresentation.
- Target words: 200 words.
- Claims: None.
- Citations: None.
