# Table: Security and Fraud Scenario Evaluation Matrix

Empirical evaluation of VeriCarbon against six canonical carbon market fraud attacks, compared
to a centralized baseline registry without global nullifier sets or in-circuit zero-knowledge verification.

| Attack | Mechanism that stops it | VeriCarbon result | Centralized baseline result |
| :--- | :--- | :--- | :--- |
| **Cross-Registry Double Issuance**<br>*Two registries register the same land parcel (`geoCommitment`) and issue duplicate credits for the same vintage year* | Global Geospatial Nullifier (`issuanceNullifier := keccak256(geoCommitment, vintageYear, creditType)`) | **REVERT (IssuanceNullifierAlreadySpent)** | SUCCEEDS (Double Mint / 2x Supply Created) |
| **Single-Registry Duplicate Issuance**<br>*Operator attempts to re-issue credits for an already credited plot or tampers with the claimed amount* | Atomic `issuanceNullifierSpent` map + In-Circuit ZK Bound Binding | **REVERT (InvalidZKProof / IssuanceNullifierAlreadySpent)** | SUCCEEDS if assigned a new local project ID |
| **Retirement Claim Replay**<br>*Claimant replays an identical retirement parameter set to claim multiple ESG / Scope 1 offsets against the same tokens* | Global Claim Nullifier (`claimNullifier := keccak256(issuanceNullifier, claimant, claimType, beneficiaryCommitment)`) | **REVERT (ClaimNullifierAlreadySpent)** | SUCCEEDS (Unbounded Duplicate Offsetting) |
| **Claim Against Non-Existent Batch**<br>*Retirement transaction targeting a non-existent serial batch identifier* | Monotonic Batch Registry & Strict Existence Check | **REVERT (BatchDoesNotExist)** | REVERT (ERC1155NonexistentToken / Silent State Corruption) |
| **Evidence / Vintage Data Mismatch**<br>*Submitting valid proof for plot A while submitting unverified data commitment for fraudulent plot B* | Halo2 Public Input Instance Binding (`publicInputs[1] == dataCommitment`) | **REVERT (InvalidZKProof)** | SUCCEEDS (Unchecked Passive Metadata) |
| **MRV Output Amount Inflation**<br>*Claiming 644 tCO2e when the verified satellite MRV model output only justifies 544 tCO2e* | In-Circuit Inequality Constraint (`claimedAmount <= model(quantizedFeatures)`) | **REVERT (InvalidZKProof)** | SUCCEEDS (Arbitrary Minting Permitted) |

### Empirical Baseline Vulnerability Demonstration

- **Foundry Verification Test:** `test_BaselineDemo_CrossRegistryDoubleIssuanceSucceedsOnBaselineRegistry`: **PASS** (`512,317` gas)
- **On-Chain Evidence Artifact:** `eval/results/baseline_double_issuance_receipt.json`
- **Finding:** In the centralized baseline registry, Registry A (`0x7099...`) and Registry B (`0x3C44...`) successfully issued 544 credits each against the identical `geoCommitment` (`6z900000`, vintage 2024), inflating total token supply to **1,088 credits** (2x true ecological biomass). In contrast, `CarbonRegistry.issue` reverts on the second attempt with `IssuanceNullifierAlreadySpent`.

> [!NOTE]
> All six fraud tests pass deterministically in Foundry Cancun EVM. Every state transition preventing double-spending and over-crediting is cryptographically enforced on-chain via ZK-SNARKs or nullifier sets.
