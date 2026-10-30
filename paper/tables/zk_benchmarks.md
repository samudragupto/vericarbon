# Table: Zero-Knowledge Verifiable MRV Circuit Benchmarks (`ezkl` Halo2 / KZG)

- **EZKL Version:** `23.0.5` (`logrows = 13`, `input_scale = 7`, `param_scale = 7`)
- **Host Machine:** `Windows 10` | `16 cores (AMD64 Family 25 Model 116 Stepping 1, AuthenticAMD)` | `15.2 GB RAM`
- **Timestamp (UTC):** `2026-10-30T14:16:51.278578+00:00`
- **Deterministic Seed:** `42`
- **Measured Foundry `Halo2Verifier.verifyProof` Gas (12 features, 4 trees):** `643,269` gas

| Features (`F`) | Trees (`T`) | Depth (`D`) | `logrows` | Setup Time (s) | Proving Time (s) | Off-Chain Verify (ms) | Proof Size (B) | EVM Verify Gas |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 8 | 2 | 2 | 13 | 0.6858 | 0.6322 | 10.56 | 4,032 | 640,889 |
| 8 | 4 | 2 | 13 | 0.7519 | 0.7651 | 11.50 | 4,032 | 642,789 |
| 8 | 8 | 2 | 13 | 0.8254 | 0.7336 | 12.31 | 4,032 | 646,589 |
| 12 *(canonical)* | 4 | 2 | 13 | 0.7250 | 0.5504 | 10.84 | 4,032 | 643,269 |
| 16 | 2 | 2 | 13 | 0.7767 | 0.5215 | 9.98 | 4,032 | 641,849 |
| 16 | 4 | 2 | 13 | 0.7109 | 0.6183 | 11.85 | 4,032 | 643,749 |
| 16 | 8 | 2 | 13 | 0.7738 | 0.6767 | 10.73 | 4,032 | 647,549 |
| 32 | 2 | 2 | 13 | 0.8488 | 0.7172 | 13.84 | 4,032 | 643,769 |
| 32 | 4 | 2 | 13 | 0.8970 | 0.6684 | 10.52 | 4,032 | 645,669 |
| 32 | 8 | 2 | 13 | 0.8123 | 0.7031 | 9.50 | 4,032 | 649,469 |
