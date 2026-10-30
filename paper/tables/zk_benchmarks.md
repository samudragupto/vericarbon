# Table: Zero-Knowledge Verifiable MRV Circuit Benchmarks (`ezkl` Halo2 / KZG)

- **EZKL Version:** `23.0.5` (`logrows = 13`, `input_scale = 7`, `param_scale = 7`)
- **Deterministic Seed:** `42`
- **Measured Foundry `Halo2Verifier.verifyProof` Gas (12 features, 4 trees):** `643,269` gas

| Features (`F`) | Trees (`T`) | Depth (`D`) | `logrows` | Setup Time (s) | Proving Time (s) | Off-Chain Verify (ms) | Proof Size (B) | EVM Verify Gas |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 8 | 2 | 2 | 13 | 0.8143 | 0.6173 | 9.81 | 4,032 | 640,889 |
| 8 | 4 | 2 | 13 | 0.8445 | 0.6436 | 10.70 | 4,032 | 642,789 |
| 8 | 8 | 2 | 13 | 0.8475 | 0.7446 | 10.34 | 4,032 | 646,589 |
| 12 *(canonical)* | 4 | 2 | 13 | 0.8708 | 0.5868 | 14.42 | 4,032 | 643,269 |
| 16 | 2 | 2 | 13 | 0.9272 | 0.5880 | 10.80 | 4,032 | 641,849 |
| 16 | 4 | 2 | 13 | 0.8756 | 0.5732 | 9.29 | 4,032 | 643,749 |
| 16 | 8 | 2 | 13 | 0.8561 | 0.5837 | 9.24 | 4,032 | 647,549 |
| 32 | 2 | 2 | 13 | 0.8574 | 0.7418 | 11.25 | 4,032 | 643,769 |
| 32 | 4 | 2 | 13 | 0.8997 | 0.5871 | 10.96 | 4,032 | 645,669 |
| 32 | 8 | 2 | 13 | 0.9616 | 0.7144 | 9.92 | 4,032 | 649,469 |
