# VeriCarbon Reproducibility Manifest

All toolchains, random seeds, dataset snapshots, and exact package versions used to generate tables and figures in `paper/` are recorded here.

## Phase 1–3 Toolchain & Pinned Versions

### Core System Toolchains
- **Node.js:** `v22.20.0`
- **Package Manager:** `pnpm@12.16.1`
- **Monorepo Orchestrator:** `turbo@2.4.4`
- **Foundry (`forge`):** `1.5.1-stable` (`solc 0.8.24`, `evm_version = "cancun"`)
- **Python Environment Manager:** `uv 0.11.15` (`CPython 3.11.9`)
- **Zero-Knowledge Proving System:** `ezkl==23.0.5` (Halo2 / KZG over BN254)
- **Target Network:** Base Sepolia (`chainId: 84532`, RPC `https://sepolia.base.org`)

### Pinned Workspace Dependencies
- **`apps/web`:** `next@15.2.1`, `react@19.0.0`, `react-dom@19.0.0`, `tailwindcss@3.4.17`, `typescript@5.8.2`, `viem@2.23.5`, `zod@3.24.2`, `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.0.2`, `lucide-react@0.477.0`
- **`packages/sdk`:** `viem@2.23.5`, `zod@3.24.2`, `typescript@5.8.2`
- **`services/mrv`:** `typer==0.15.2`, `numpy==2.4.6`, `pandas==3.1.0`, `pyarrow==26.0.0`, `scikit-learn==1.9.1`, `onnx==1.23.2`, `skl2onnx==1.20.0`, `onnxruntime==1.31.1`, `pystac-client==0.9.1`, `planetary-computer==1.0.0`, `xarray==2026.9.0`, `rioxarray==0.19.0`, `pytest==8.3.5`, `ruff==0.9.9`, `black==25.1.0`, `hatchling==1.27.0`
- **`services/zk`:** `ezkl==23.0.5`, `numpy==2.4.6`, `onnx==1.23.2`, `onnxruntime==1.31.1`, `typer==0.15.2`, `pytest==8.3.5`, `ruff==0.9.9`, `black==25.1.0`, `hatchling==1.27.0`

## Phase 2 MRV Data Pipeline Reproducibility & Limitations

- **Deterministic Seed:** `SEED = 42` across all NumPy RNGs, feature quantization, salt derivation, and `HistGradientBoostingRegressor(random_state=42)`.
- **AOI & Spatial-Block Split:** Default AOI `-54.8485,-2.8172,-54.8390,-2.8078` (~1.05 km × 1.05 km chip in Tapajós National Forest, Pará, Brazil). Split strictly by `geohash5` prefix (`train_geohash5_blocks: ["6z2zz", "6z3pb", "6z8bp"]`, `test_geohash5_blocks: ["6z900"]`) to prevent spatial autocorrelation leakage.
- **Biomass (AGB) Labels Limitation Log (per `AGENT.md` lines 29–32):**
  - Probing Microsoft Planetary Computer's public STAC API for `gedi-l4a` and `esa-cci-biomass` confirmed that neither GEDI L4A (requires NASA Earthdata Login) nor ESA CCI Biomass is available without external authentication on Planetary Computer's public STAC catalog.
  - Per the fallback rule in `AGENT.md`, pixel-level AGB labels (`agb_mg_ha`) are synthesized deterministically (`SEED = 42`) from ESA WorldCover canopy classes and seasonal Sentinel-2 NDVI/NDRE trajectories, and cached in `services/mrv/tests/fixtures/sentinel2_window_cube.npz`.
- **Carbon Conversion Constant:** `TCO2E_PER_TON_AGB = 0.47 * (44 / 12) = 1.7233333333333334 tCO2e / Mg AGB` (IPCC 2006 / 2019 Refinement Guidelines for National Greenhouse Gas Inventories, Vol. 4 AFOLU, Ch. 4 Forest Land, Table 4.3).

## Phase 3 Zero-Knowledge Verifiable Inference (`services/zk` & `Halo2Verifier.sol`)

- **Pinned `ezkl` Release:** `ezkl==23.0.5`
- **Fixed-Point Scaling:** Read directly from `services/mrv/tests/fixtures/dataset_manifest.json` (`0.001` for continuous spectral indices, `1.0` for WorldCover one-hots), compiled with `input_scale = 7`, `param_scale = 7`, `scale_rebase_multiplier = 1`, `logrows = 13`, `lookup_range = (-2048, 2048)`.
- **In-Circuit Commitment & Deviation Log:**
  - Full 64-round bitwise SHA-256 inside an arithmetic BN254 Halo2 circuit requires >50,000 lookup rows and exceeds single-CPU laptop proving and EVM verifier size budgets.
  - Following the Phase 3 prompt allowance (*"if full sha256 in-circuit is impractical, use ezkl's elated commitment/poseidon approach and document the deviation explicitly"*), the circuit computes an in-circuit universal linear hash commitment over the private `quantizedFeatures` vector (`output[0, 1]`) paired with `ezkl.poseidon_hash` over the input field elements (`04b6dcc8c1ea0ecfa16813d5c03383c936cdfb26bc9f9e1e9f9571006a730726`), while the off-chain SHA-256 `dataCommitment` is recorded in the evidence bundle.
- **Tree Sizing for Laptop CPU & EVM Bytecode Limit:**
  - The default verifiable circuit uses `num_trees = 4`, `tree_depth = 2` (`12` features, `logrows = 13`), achieving `0.86s` setup time, `0.64s` proving time on a laptop CPU, `4,032`-byte proof size, `18,007`-byte deployed `Halo2Verifier.sol` contract size (below the 24,576-byte Spurious Dragon limit), and `643,269` EVM verification gas.
  - Regenerable benchmark sweeps across `features ∈ {8, 12, 16, 32}` and `trees ∈ {2, 4, 8}` are produced by `eval/zk_benchmarks.py` and written to `eval/results/zk_benchmarks.json` and `paper/tables/zk_benchmarks.md`.
