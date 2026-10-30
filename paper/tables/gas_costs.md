# Table: Smart Contract Gas Consumption and Cost Comparison

> [!IMPORTANT]
> **Assumed Economic Parameters (Simulation Only):**
> - Assumed ETH Price: **$2,500.00**
> - Base L2 Gas Price: **0.005 gwei** (+ **$0.001** amortized EIP-4844 blob fee)
> - Ethereum L1 Gas Price: **25.0 gwei**
> These parameters are modeled projections to compare L1 vs. L2 economics and are not live financial quotes.

| Contract | Function / Mechanism | Measured Gas (Median) | Est. Cost on Base L2 (USD) | Est. Cost on Ethereum L1 (USD) | Relative Overhead / Note |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `CarbonRegistry.registerProject` | Geospatial commitment registration + IPFS CID binding | 118,333 | **$0.0025** | $7.40 |
| `CarbonRegistry.issue` | Halo2 ZK proof verification + issuanceNullifier + ERC1155 mint | 873,164 | **$0.0119** | $54.57 |
| `CarbonRegistry.retire` | Batch burn + claimNullifier collision check | 74,121 | **$0.0019** | $4.63 |
| `CarbonRegistry.retireAmounts` | Partial fractional retirement + claimNullifier check | 111,476 | **$0.0024** | $6.97 |
| `Halo2Verifier.verifyProof` | Isolated KZG pairing + quotient check (in-circuit zkMRV) | 643,269 | **$0.0090** | $40.20 |
| `BaselineCentralRegistry.registerProject` | Naive project record without global geo deduplication | 185,960 | **$0.0033** | $11.62 |
| `BaselineCentralRegistry.issue` | Naive credit minting (NO ZK verification, NO nullifier) | 115,632 | **$0.0024** | $7.23 |

### Issuance (`CarbonRegistry.issue`) Gas Component Decomposition

| Subsystem | Gas Allocated | Fraction of Total Gas (%) | Est. Cost on Base L2 | Function / Purpose |
| :--- | :---: | :---: | :---: | :--- |
| **Halo2 ZK Verification** | 643,269 | 73.7% | $0.0090 | On-chain BN254 pairing & polynomial opening |
| **Issuance Nullifier Record** | 23,500 | 2.7% | $0.0013 | `issuanceNullifierSpent[nullifier] = true` |
| **ERC1155 Token Minting** | 113,473 | 13.0% | $0.0024 | Monotonic batch creation & balance update |
| **Dispatcher & Logging** | 92,922 | 10.6% | $0.0022 | Input validation & `Issued` event emission |
| **Total `issue(...)`** | **873,164** | **100.0%** | **$0.0119** | Full end-to-end atomic issuance |

> [!NOTE]
> While Halo2 ZK verification accounts for **73.7%** of the transaction gas, the post-Dencun Base L2 rollup fee keeps the total cost per verified credit batch at approximately **$0.012** (1.2 cents), compared to **$54.57** on Ethereum L1. This confirms that cryptographic zero-knowledge verification is economically viable on modern L2 rollups for carbon credit issuance.
