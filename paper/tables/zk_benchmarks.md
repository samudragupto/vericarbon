# Table: Zero-Knowledge Verifiable MRV Circuit Benchmarks (`ezkl` Halo2 / KZG)

- **EZKL Version:** `23.0.5` (`logrows = 13`, `input_scale = 7`, `param_scale = 7`)
- **Host Machine:** `Microsoft Windows 11 Home Single Language` | `8 cores (AMD Ryzen 7 7840HS w/ Radeon 780M Graphics)` | `16.0 GB RAM`
- **Timestamp (UTC):** `2026-10-30T16:12:44.667129+00:00`
- **Deterministic Seed:** `42`
- **Measured Foundry `Halo2Verifier.verifyProof` Gas (12 features, 4 trees):** `643,269` gas

| Features (`F`) | Trees (`T`) | Depth (`D`) | `logrows` | Setup Time (s) | Proving Time (s) | Off-Chain Verify (ms) | Proof Size (B) | EVM Verify Gas |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 8 | 2 | 2 | 13 | 0.7698 | 0.5768 | 11.10 | 4,032 | 640,889 |
| 8 | 4 | 2 | 13 | 0.7834 | 0.6697 | 10.79 | 4,032 | 642,789 |
| 8 | 8 | 2 | 13 | 0.7783 | 0.5961 | 10.21 | 4,032 | 646,589 |
| 12 *(canonical)* | 4 | 2 | 13 | 0.7503 | 0.5634 | 10.77 | 4,032 | 643,269 |
| 16 | 2 | 2 | 13 | 0.7629 | 0.5646 | 10.98 | 4,032 | 641,849 |
| 16 | 4 | 2 | 13 | 0.7476 | 0.6380 | 9.97 | 4,032 | 643,749 |
| 16 | 8 | 2 | 13 | 0.7522 | 0.5661 | 9.79 | 4,032 | 647,549 |
| 32 | 2 | 2 | 13 | 0.7955 | 0.6280 | 9.74 | 4,032 | 643,769 |
| 32 | 4 | 2 | 13 | 0.7436 | 0.7537 | 10.86 | 4,032 | 645,669 |
| 32 | 8 | 2 | 13 | 0.8076 | 0.6263 | 10.33 | 4,032 | 649,469 |
