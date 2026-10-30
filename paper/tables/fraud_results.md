# Table: Security and Fraud Scenario Evaluation Matrix (Amendment A0)

Empirical evaluation of VeriCarbon against seven canonical carbon market fraud attacks (A1–A7) and two pre-A0 vulnerabilities,
compared to a centralized baseline registry without global nullifier sets or in-circuit zero-knowledge verification.

| Attack | Mechanism that stops it | VeriCarbon result | Centralized baseline result |
| :--- | :--- | :--- | :--- |
| **Pre-A0 Salt-Dodge Double Issuance**<br>*Attacker registers identical land with a different salt under pre-A0 nullifier, dodging nullification* | Pre-A0 Nullifier (`issuanceNullifier := keccak256(projectId, vintageYear, creditType)`) | **VULNERABLE before A0 (mitigated after A0)** | SUCCEEDS (Double Mint / 2x Supply Created) |
| **Pre-A0 Vintage Relabel / Unbounded Vintage**<br>*Unconstrained vintage string allows relabeling vintage (e.g. '2024-A', '2024-B') or claiming arbitrary future vintages* | Pre-A0 Unconstrained Vintage String | **VULNERABLE before A0 (mitigated after A0)** | SUCCEEDS (Unbounded Duplicate Offsetting) |
| **Cross-Registry Double Issuance**<br>*Two registries register the same land parcel (`geohash8`) and issue duplicate credits for the same vintage year* | Global Geospatial Nullifier (`issuanceNullifier := keccak256(geohash8, vintageYear, creditType)`) | **REVERT (IssuanceNullifierAlreadySpent)** | SUCCEEDS (Double Mint / 2x Supply Created) |
| **Single-Registry Duplicate Issuance**<br>*Operator attempts to re-issue credits for an already credited plot and vintage in the same registry* | Atomic `issuanceNullifierSpent` map on `keccak256(geohash8, vintageYear, creditType)` | **REVERT (IssuanceNullifierAlreadySpent)** | SUCCEEDS (Duplicate Minting) |
| **Salt-Dodge Re-Registration Attack**<br>*Attacker generates fresh salt2 for same parcel (geohash8) to create new `geoCommitment` and issue duplicate credits* | Salt-Independent Nullifier (`keccak256(geohash8, vintageYear, creditType)` asserts parcel unicity regardless of salt) | **REVERT (IssuanceNullifierAlreadySpent) [A0 Fix Proof]** | SUCCEEDS (Bypasses commitment match) |
| **Retirement Claim Replay**<br>*Claimant replays an identical retirement parameter set to claim multiple ESG / Scope 1 offsets against the same tokens* | Global Claim Nullifier (`claimNullifier := keccak256(issuanceNullifier, claimant, claimType, beneficiaryCommitment)`) | **REVERT (ClaimNullifierAlreadySpent)** | SUCCEEDS (Unbounded Duplicate Offsetting) |
| **Claim Against Non-Existent Batch**<br>*Retirement transaction targeting a non-existent serial batch identifier* | Monotonic Batch Registry & Strict Existence Check (`serialId <= totalBatches`) | **REVERT (BatchDoesNotExist)** | REVERT (ERC1155NonexistentToken / Silent State Corruption) |
| **MRV Output Amount Inflation**<br>*Claiming 644 tCO2e when the verified satellite MRV model output only justifies 544 tCO2e* | In-Circuit Inequality Constraint (`claimedAmount <= model(quantizedFeatures)`) | **REVERT (InvalidZKProof)** | SUCCEEDS (Arbitrary Minting Permitted) |
| **Credit-Type Relabel or Future Vintage Year**<br>*Relabeling credit type or setting unverified future vintage year (`vintageYear > currentYear`)* | Strict Range Check (`2000 <= vintageYear <= currentYear`) & Enum Bounds | **REVERT (InvalidVintageYear / InvalidCreditType)** | SUCCEEDS (Arbitrary Future Forward Minting) |

### Empirical Baseline Vulnerability Demonstration

- **Foundry Verification Test:** `test_BaselineDemo_CrossRegistryAndSaltDodgeDoubleIssuanceSucceedOnBaselineRegistry`: **PASS** (`513,980` gas)
- **On-Chain Evidence Artifact:** `eval/results/baseline_double_issuance_receipt.json`
- **Finding:** In the centralized baseline registry, Registry A (`0x7099...`) and Registry B (`0x3C44...`) successfully issued 544 credits each against the identical parcel (`6z900000`, vintage 2024), and salt-dodge double issuance succeeded, inflating total token supply to **1,088 credits** (2x true ecological biomass). In contrast, VeriCarbon's `CarbonRegistry.issue` reverts with `IssuanceNullifierAlreadySpent`.

> [!NOTE]
> All nine security tests (Hole A, Hole B, A1–A7) pass deterministically in Foundry Cancun EVM. Every state transition preventing double-spending, salt-dodging, and over-crediting is cryptographically enforced on-chain via ZK-SNARKs and global nullifier sets.
