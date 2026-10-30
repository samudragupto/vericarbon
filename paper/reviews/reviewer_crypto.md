# Reviewer 2: Cryptography & Security

**Reviewer Focus:** Zero-knowledge circuit soundness, cryptographic nullifiers, Poseidon binding, Lemma 1 formalization, and arithmetic field constraints.  
**Overall Recommendation:** Minor Revision (Strong Accept pending cryptographic formalizations).

---

### Meta-Review Summary
The paper provides a rigorous, mathematically grounded protocol for verifiable machine learning inference and decentralized double-issuance prevention. The cryptographic design is anchored by two key mechanisms: (1) an arithmetic Halo2/KZG circuit verifying fixed-point tree ensembles with Poseidon feature binding, and (2) a salt-independent, registry-independent global nullifier scheme (Amendment A0) that cryptographically enforces parcel unicity on-chain.

The security suite evaluates seven canonical fraud vectors (A1–A7) and demonstrates the interception of pre-A0 vulnerabilities (Hole A and Hole B). To make the cryptographic formalization completely watertight for publication in FGCS, the authors should address the following points regarding field arithmetic wrap-around, binding trade-offs, and Lemma 1 assumptions.

---

### Major Comments

1. **Major 1 (In-Circuit Poseidon Binding vs. Off-Chain SHA-256):**  
   The paper adopts a dual-commitment strategy: Poseidon hash inside the Halo2 circuit for computational efficiency, and SHA-256 in the signed IPFS evidence bundle for third-party transparency. The authors must formally explain the security binding between these two commitments. Specifically: Can an adversary find two distinct feature vectors $X_1 \neq X_2$ such that $\mathcal{H}_{\text{poseidon}}(X_1) = \mathcal{H}_{\text{poseidon}}(X_2)$ or produce an off-chain SHA-256 preimage that maps to a different in-circuit Poseidon instance? The collision resistance of Poseidon over BN254 should be formally invoked.

2. **Major 2 (Soundness of Negative Return Value in Where Node):**  
   In Section 4.7, the in-circuit constraint is defined as $\text{claimedAmount} = \text{Where}(m \le f_{\text{model}}(X), m, -1)$. In the scalar field $\mathbb{F}_p$ of BN254, the integer $-1$ is represented as $p - 1 \approx 2^{254} - 1$. The authors must clarify how `Halo2Verifier.sol` handles this: On-chain, `claimedAmount` is cast to `uint256`. If the circuit evaluates to $-1$, does it submit $p-1$ as the public instance? Because `CarbonRegistry.sol` checks that the public instance matches `calldata uint256 amount`, if the caller requested $m = 644$, but the circuit outputs $p-1$, the instance check fails and reverts. This exact mechanism must be stated explicitly to eliminate ambiguity regarding scalar field wrap-around.

3. **Major 3 (Lemma 1 Assumptions & Malicious Registry Independence):**  
   The proof of Lemma 1 (Cross-Registry Issuance Unicity) by contradiction is logically sound. However, the authors should emphasize that the unicity guarantee holds *even if Registry B is fully Byzantine or collusive*. Because $\mathcal{N}_{\text{iss}} := \text{keccak256}(g, v, \tau)$ does not contain the registry address `msg.sender` or `projectId`, the smart contract enforces that a corrupt registry has zero mathematical capability to mint credits for an already issued $(g, v, \tau)$, regardless of credentials.

4. **Major 4 (Commitment Lifecycle & Landholder Privacy Expiration):**  
   The paper defines the geospatial commitment $\mathcal{C}_{\text{geo}} := \mathcal{H}_{\text{keccak}}(g, s)$ at project registration, but requires disclosure of $g$ and $s$ as public calldata during `issue()`. The authors should explicitly clarify that Definition 1 provides *pre-issuance speculative privacy* (protecting landholders during project scoping), whereas at issuance, the geohash8 centroid $g$ is intentionally revealed on-chain to enable public deduplication. This trade-off between privacy and deduplication should be formally delineated.

---

### Minor Comments

1. **Minor 1 (Canonical ABI Encoding):**  
   In Definition 1 and Definition 2, the equations use `abi.encode(g, s)`. Please clarify that Solidity's standard `abi.encode` pads strings/bytes and integers to 32-byte words, preventing length-extension ambiguity that could arise with `abi.encodePacked`.

2. **Minor 2 (KZG Trusted Setup Transparency):**  
   Section 5.2 states that the Structured Reference String (SRS) is downloaded from the Ethereum KZG ceremony. Please cite the exact ceremony power-of-two parameters used (e.g., Hermez/Ethereum KZG ceremony up to $2^{13}$ degrees) and confirm that no toxic waste remains.

3. **Minor 3 (Claim Nullifier Construction):**  
   In Definition 3, explain why both `claimant` address and `beneficiaryCommitment` are included in $\mathcal{N}_{\text{claim}}$, confirming that corporate re-claims by different entities against the same retired batch are precluded.

4. **Minor 4 (Formal Invariant Definition):**  
   In Section 6.3, explicitly cite the Foundry invariant test signatures (`invariant_NoClaimNullifierRecordedTwice` and `invariant_TotalRetiredNeverExceedsTotalIssued`) to tie the formal lemmas directly to the automated test harness.

