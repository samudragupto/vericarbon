# Reviewer 1: Systems & Distributed Computing

**Reviewer Focus:** Distributed systems architecture, smart contract performance, baseline evaluation fairness, network latency methodology, and Layer 2 scalability.  
**Overall Recommendation:** Minor Revision (Strong Accept pending clarifications).

---

### Meta-Review Summary
The manuscript presents VeriCarbon, a decentralized, zero-knowledge verifiable Monitoring, Reporting, and Verification (MRV) architecture for voluntary carbon credit markets. The core system contribution—enforcing cross-registry spatial unicity via on-chain salt-independent nullifiers on Ethereum Layer 2 rollups—addresses a documented failure mode in decentralized carbon tokenization. The system implementation is exceptionally complete, featuring a unified monorepo with an on-chain Halo2 verifier, custom Solidity contracts, an off-chain PostgreSQL event indexer, and a Next.js front-end explorer. The evaluation includes gas profiling, latency measurements, and an adversarial test suite in Foundry.

However, several systems-level questions regarding baseline comparison fairness, Layer 2 sequencer trust models, and latency statistical rigor must be addressed before publication.

---

### Major Comments

1. **Major 1 (Baseline Fairness & Centralized Database Scope):**  
   The comparison against `BaselineCentralRegistry.sol` effectively demonstrates that naive ERC-1155 or ERC-20 transfer-log ledgers (like Toucan and KlimaDAO) fail to prevent double-minting across independent registries. However, a skeptical reviewer might ask: *Could a centralized consortium simply operate a shared PostgreSQL database with a `UNIQUE(geohash8, vintage_year, credit_type)` constraint?* The authors should explicitly clarify in Section 2.2 and Section 3.1 why a centralized consortium database fails in an adversarial multi-jurisdictional setting (e.g., jurisdictional sovereignty, unilateral database mutation, lack of cryptographic non-repudiation, single point of failure, and censorship).

2. **Major 2 (Layer 2 Sequencer Centralization and Front-Running):**  
   The paper benchmarks execution on Base Sepolia (an optimistic Layer 2 rollup). The authors correctly discuss the 7-day challenge window in Section 7.4. However, they should also analyze the sequencer's role: Can a centralized sequencer front-run or censor a legitimate registry's `issue()` transaction to favor a competing registry, and how does Ethereum L1 force-inclusion mitigate this?

3. **Major 3 (Latency Methodology & Statistical Rigor):**  
   In Section 6.4 (Table 6), RPC roundtrip latency and off-chain indexer visibility lag are benchmarked with $N=20$ trials. While reporting mean and p95 is good practice, the authors should state the distribution shape (e.g., standard deviation, min/max) and clarify whether RPC jitter was influenced by public rate-limiting, ensuring reproducible statistical interpretation.

4. **Major 4 (Batching and Amortization of Pairing Verification):**  
   Issuance gas is dominated by Halo2 pairing checks (643,269 gas, 73.7% of total cost). On Base L2, this costs $0.0119, which is negligible; however, on Ethereum L1, it costs $54.57. The authors should explicitly discuss whether recursive SNARK aggregation or batch verification (verifying $K$ parcels in one multi-pairing check) is architecturally compatible with VeriCarbon to further amortize verification costs.

---

### Minor Comments

1. **Minor 1 (EIP-170 Safety Margin):**  
   In Section 5.2 and Section 6.2, the initcode size of `Halo2Verifier.sol` is reported as 18,007 bytes against the 24,576-byte EIP-170 limit. Please explicitly state the exact numerical delta (6,569 bytes margin) in both sections for readability.

2. **Minor 2 (Reorg Handling in Event Indexer):**  
   Section 5.3 mentions idempotent compound keys `(tx_hash, log_index)` in PostgreSQL. Please clarify how the indexer handles 1-2 block micro-reorgs on Base Sepolia (e.g., via block confirmation depth or transactional rollback).

3. **Minor 3 (Lighthouse Audit Environment):**  
   Section 5.3 notes a Lighthouse performance score of 95/100. State the test environment parameters (e.g., mobile vs. desktop simulation, local dev server vs. production build) to support reproducibility.

4. **Minor 4 (Figure Labels):**  
   In Figure 3(a), ensure that the gas breakdown labels clearly distinguish protocol logic overhead from standard ERC-1155 storage writes.

