# Table: Zero-Knowledge Verifiable MRV Circuit Benchmarks (`ezkl` Halo2 / KZG)

- **EZKL Version:** `23.0.5` (`logrows = 13`, `input_scale = 7`, `param_scale = 7`)
- **Host Machine:** `Windows 10` | `16 cores (AMD64 Family 25 Model 116 Stepping 1, AuthenticAMD)` | `15.2 GB RAM`
- **Timestamp (UTC):** `2026-10-30T09:11:52.784800+00:00`
- **Deterministic Seed:** `42`
- **Measured Foundry `Halo2Verifier.verifyProof` Gas (12 features, 4 trees):** `643,269` gas

| Features (`F`) | Trees (`T`) | Depth (`D`) | `logrows` | Setup Time (s) | Proving Time (s) | Off-Chain Verify (ms) | Proof Size (B) | EVM Verify Gas |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 8 | 2 | 2 | 13 | 0.7641 | 0.6424 | 12.30 | 4,032 | 640,889 |
| 8 | 4 | 2 | 13 | 0.7780 | 0.5833 | 10.02 | 4,032 | 642,789 |
| 8 | 8 | 2 | 13 | 0.7759 | 0.6523 | 10.61 | 4,032 | 646,589 |
| 12 *(canonical)* | 4 | 2 | 13 | 0.7849 | 0.7331 | 12.06 | 4,032 | 643,269 |
| 16 | 2 | 2 | 13 | 0.7693 | 0.6506 | 12.24 | 4,032 | 641,849 |
| 16 | 4 | 2 | 13 | 0.8345 | 0.6695 | 11.50 | 4,032 | 643,749 |
| 16 | 8 | 2 | 13 | 0.8251 | 0.7059 | 9.51 | 4,032 | 647,549 |
| 32 | 2 | 2 | 13 | 0.7965 | 0.6609 | 10.13 | 4,032 | 643,769 |
| 32 | 4 | 2 | 13 | 0.8204 | 0.7140 | 10.51 | 4,032 | 645,669 |
| 32 | 8 | 2 | 13 | 0.8493 | 0.6303 | 11.51 | 4,032 | 649,469 |
