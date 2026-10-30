# VeriCarbon ZK Workspace (`services/zk`)

This directory houses the zero-knowledge verifiable inference pipeline powered by **ezkl**.

## Planned Workspace Files (Future Phases)

| File / Directory | Purpose |
| :--- | :--- |
| `model.onnx` | Exported ONNX graph of the trained biomass quantification model (`services/mrv`). |
| `settings.json` | `ezkl` circuit configuration (fixed-point scale factors, visibility of inputs/params/outputs, logrows). |
| `input.json` | Calibration / inference input tensor payload containing normalized Sentinel-2 + WorldCover features. |
| `compiled.ezkl` | Compiled Halo2 circuit representation produced by `ezkl compile-circuit`. |
| `pk.key` / `vk.key` | Proving key and verification key generated during circuit setup (`ezkl setup`). |
| `srs.params` | Structured Reference String (KZG commitment parameters) cached for deterministic proving. |
| `witness.json` | Computed circuit witness from running `ezkl gen-witness` on `input.json` and `compiled.ezkl`. |
| `proof.json` | Generated zero-knowledge proof attesting that `claimedAmount <= model(preimage(dataCommitment))`. |
| `Verifier.sol` | Auto-generated Solidity Halo2 verifier contract exported to `packages/contracts/src/` for on-chain verification on Base Sepolia. |

## Statement Proved

Per `AGENT.md`:
- **Public inputs:** `[modelHash, dataCommitment, claimedAmount]`
- **Relation:** `claimedAmount <= model(preimage(dataCommitment))` computed in fixed-point arithmetic and verified on-chain via the `ezkl`-generated Solidity verifier contract.

