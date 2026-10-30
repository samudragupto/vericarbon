# Appendices

## Appendix A: Artifact Reproducibility Guide

To adhere to the rigorous reproducibility requirements of FGCS and the ACM/IEEE Artifact Evaluation guidelines, the complete VeriCarbon evaluation suite is structured for single-command deterministic re-execution.

### A.1 One-Command Full Evaluation Rerun
From a clean checkout with Foundry, Node.js 22+, and `uv` installed, execute:
\begin{verbatim}
uv run eval/run_all.py
\end{verbatim}
This orchestrates the five modular benchmark scripts with fixed deterministic seed `SEED = 42`:
1. `eval/model_metrics.py`: Evaluates spatial-block cross-validation for `HistGradientBoostingRegressor` on Sentinel-2 + ESA WorldCover rasters -> `paper/tables/model_metrics.md` and `eval/results/model_metrics.json`.
2. `eval/zk_benchmarks.py`: Re-runs the Halo2/KZG circuit complexity sweep across $F \in \{8, 12, 16, 32\}$ and $T \in \{2, 4, 8\}$, recording host specs and proving latency -> `paper/tables/zk_benchmarks.md` and `eval/results/zk_benchmarks.json`.
3. `eval/gas_costs.py`: Executes `forge test --gas-report`, measures median gas across contract operations, and models USD costs for Base L2 vs. Ethereum L1 -> `paper/tables/gas_costs.md` and `eval/results/gas_costs.json`.
4. `eval/fraud_simulation.py`: Executes the 9 security scenarios in Foundry, launches an ephemeral Anvil node to execute `BaselineDoubleIssuance.s.sol`, and extracts transaction receipts -> `paper/tables/fraud_results.md`, `eval/results/fraud_results.json`, and `eval/results/baseline_double_issuance_receipt.json`.
5. `eval/latency.py`: Measures public Base Sepolia RPC latency ($N=20$) and indexer synchronization lag -> `paper/tables/latency.md` and `eval/results/latency.json`.
6. Figures & Manifest: Generates high-resolution publication figures (`paper/figures/proving_time.png` and `paper/figures/gas_comparison.png`) and writes `eval/results/manifest.json`.

### A.2 Automated Manifest Verification
`eval/write_manifest.py` extracts exact dependency versions directly from `pnpm-lock.yaml`, `uv.lock`, and `forge --version`, automatically refreshing `docs/REPRODUCIBILITY.md` and verifying that all 15 manuscript artifacts exist and are non-empty.

## Appendix B: Extended Security Traces & Formal Lemma 1 Proof

### B.1 Complete Proof of Lemma 1 (Cross-Registry Unicity)

*Proof.* Let $\mathcal{H}: \{0,1\}^* \rightarrow \{0,1\}^{256}$ denote Keccak-256, assumed $(t, \epsilon)$-collision resistant. Let $\mathbb{S}$ denote the persistent key-value state of `CarbonRegistry.sol`.
Let $T_1 = \text{issue}(P_1, g_1, s_1, v_1, \tau_1, m_1, D_1, \pi_1)$ be a valid issuance transaction mined at block height $h_1$. 
Execution sets:
$$\mathbb{S}[\text{issuanceNullifierSpent}][\mathcal{H}(g_1, v_1, \tau_1)] \leftarrow \text{true}$$

Suppose a second transaction $T_2 = \text{issue}(P_2, g_2, s_2, v_2, \tau_2, m_2, D_2, \pi_2)$ is mined at block height $h_2 \ge h_1$, representing double-issuance on the same land, vintage, and credit type ($g_2 = g_1, v_2 = v_1, \tau_2 = \tau_1$).
$T_2$ computes $\mathcal{N}_2 = \mathcal{H}(g_2, v_2, \tau_2) = \mathcal{H}(g_1, v_1, \tau_1) = \mathcal{N}_1$.
$T_2$ evaluates the guard condition:
$$\text{require}(!\mathbb{S}[\text{issuanceNullifierSpent}][\mathcal{N}_2], \text{IssuanceNullifierAlreadySpent})$$
Since $\mathbb{S}[\text{issuanceNullifierSpent}][\mathcal{N}_1] == \text{true}$, this condition evaluates to `false`, causing $T_2$ to revert with `IssuanceNullifierAlreadySpent`. 

To prevent reverting, an adversary must find $(g_2, v_2, \tau_2) \neq (g_1, v_1, \tau_1)$ such that $\mathcal{H}(g_2, v_2, \tau_2) = \mathcal{H}(g_1, v_1, \tau_1)$, which succeeds with probability at most $\epsilon \le \mathcal{O}(2^{-128})$. Thus, cross-registry duplicate issuance is cryptographically eliminated. $\blacksquare$

### B.2 Baseline Registry Vulnerability Transaction Receipt Trace
From `eval/results/baseline_double_issuance_receipt.json`, the two competing broadcast transactions on `BaselineCentralRegistry.sol` succeeded under identical parameters:
* **Registry A Transaction:** Broadcast by `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`, Project ID `0xeecf...`, Minted Batch: `1` (544 credits).
* **Registry B Transaction:** Broadcast by `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`, Project ID `0x239a...`, Minted Batch: `2` (544 credits).
* **Total Minted Supply:** 1,088 credits against the fixture parcel's certified model output of 544 credits. Under VeriCarbon, Registry B's transaction reverts with `IssuanceNullifierAlreadySpent(0x1771171c...)`.
