# Table: Zero-Knowledge Verifiable MRV Circuit Benchmarks (`ezkl` Halo2 / KZG)

- **EZKL Version:** `23.0.5` (`logrows = 13`, `input_scale = 7`, `param_scale = 7`)
- **Host Machine:** `Windows 10` | `16 cores (AMD64 Family 25 Model 116 Stepping 1, AuthenticAMD)` | `15.2 GB RAM`
- **Timestamp (UTC):** `2026-10-30T14:13:02.391978+00:00`
- **Deterministic Seed:** `42`
- **Measured Foundry `Halo2Verifier.verifyProof` Gas (12 features, 4 trees):** `643,269` gas

| Features (`F`) | Trees (`T`) | Depth (`D`) | `logrows` | Setup Time (s) | Proving Time (s) | Off-Chain Verify (ms) | Proof Size (B) | EVM Verify Gas |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 8 | 2 | 2 | 13 | 0.7165 | 0.5613 | 11.56 | 4,032 | 640,889 |
| 8 | 4 | 2 | 13 | 0.7307 | 0.5912 | 10.65 | 4,032 | 642,789 |
| 8 | 8 | 2 | 13 | 0.7369 | 0.6093 | 11.38 | 4,032 | 646,589 |
| 12 *(canonical)* | 4 | 2 | 13 | 0.7366 | 0.5476 | 10.47 | 4,032 | 643,269 |
| 16 | 2 | 2 | 13 | 0.7064 | 0.5680 | 9.56 | 4,032 | 641,849 |
| 16 | 4 | 2 | 13 | 0.7260 | 0.7214 | 10.98 | 4,032 | 643,749 |
| 16 | 8 | 2 | 13 | 0.8295 | 0.6576 | 11.66 | 4,032 | 647,549 |
| 32 | 2 | 2 | 13 | 0.7888 | 0.6249 | 10.70 | 4,032 | 643,769 |
| 32 | 4 | 2 | 13 | 0.8421 | 0.7489 | 10.01 | 4,032 | 645,669 |
| 32 | 8 | 2 | 13 | 0.8425 | 0.6695 | 8.74 | 4,032 | 649,469 |
