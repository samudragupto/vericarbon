# VeriCarbon Reproducibility Manifest

All toolchains, random seeds, dataset snapshots, and exact package versions used to generate tables and figures in `paper/` are recorded here.

## Phase 1 & Phase 2 Toolchain & Pinned Versions

### Core System Toolchains
- **Node.js:** `v22.20.0`
- **Package Manager:** `pnpm@12.16.1`
- **Monorepo Orchestrator:** `turbo@2.4.4`
- **Foundry (`forge`):** `1.5.1-stable` (`solc 0.8.24`, `evm_version = "cancun"`)
- **Python Environment Manager:** `uv 0.11.15` (`CPython 3.11.9`)
- **Target Network:** Base Sepolia (`chainId: 84532`, RPC `https://sepolia.base.org`)

### Pinned Workspace Dependencies
- **`apps/web`:** `next@15.2.1`, `react@19.0.0`, `react-dom@19.0.0`, `tailwindcss@3.4.17`, `typescript@5.8.2`, `viem@2.23.5`, `zod@3.24.2`, `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.0.2`, `lucide-react@0.477.0`
- **`packages/sdk`:** `viem@2.23.5`, `zod@3.24.2`, `typescript@5.8.2`
- **`services/mrv`:**
  - `typer==0.15.2`
  - `numpy==2.4.6`
  - `pandas==3.1.0`
  - `pyarrow==26.0.0`
  - `scikit-learn==1.9.1`
  - `onnx==1.23.2`
  - `skl2onnx==1.20.0`
  - `onnxruntime==1.31.1`
  - `pystac-client==0.9.1`
  - `planetary-computer==1.0.0`
  - `xarray==2026.9.0`
  - `rioxarray==0.19.0`
  - `pytest==8.3.5`
  - `ruff==0.9.9`
  - `black==25.1.0`
  - `hatchling==1.27.0`

## Phase 2 MRV Data Pipeline Reproducibility & Limitations

- **Deterministic Seed:** `SEED = 42` across all NumPy RNGs, feature quantization, salt derivation, and `HistGradientBoostingRegressor(random_state=42)`.
- **AOI & Spatial-Block Split:** Default AOI `-54.8485,-2.8172,-54.8390,-2.8078` (~1.05 km × 1.05 km chip in Tapajós National Forest, Pará, Brazil, centroid `geohash8 = 6y8p8zpe`). This chip straddles both the `-54.84375°` longitude and `-2.8125°` latitude `geohash5` boundaries, yielding 4 distinct `geohash5` spatial blocks (`6y8p8`, `6y8p9`, `6y8pb`, `6y8pc`). Train/test splitting is performed strictly by `geohash5` prefix (3 train blocks, 1 held-out test block) to prevent spatial autocorrelation leakage.
- **Sentinel-2 L2A & ESA WorldCover:** Queried from Microsoft Planetary Computer STAC (`https://planetarycomputer.microsoft.com/api/stac/v1`, collections `sentinel-2-l2a` and `esa-worldcover`) across the 2024 growing season (`2024-05-01/2024-10-31`), filtered via the Scene Classification Layer (`SCL` clear-sky classes `{4, 5, 6, 7}` with `>= 80%` clear-pixel threshold). All STAC metadata and windowed arrays are cached under `services/mrv/tests/fixtures/` for 100% offline test execution.
- **Biomass (AGB) Labels Limitation Log (per `AGENT.md` lines 29–32):**
  - Probing Microsoft Planetary Computer's public STAC API for `gedi-l4a` and `esa-cci-biomass` confirmed that neither GEDI L4A (which requires authenticated NASA Earthdata Login credentials on LP DAAC) nor ESA CCI Biomass is available without external authentication on Planetary Computer's public STAC catalog.
  - Following the explicit fallback rule in `AGENT.md` (*"if neither is accessible without auth, build with small synthesized fixture data and log the limitation in docs/REPRODUCIBILITY.md"*), pixel-level AGB labels (`agb_mg_ha`, in metric tons of dry biomass per hectare) are synthesized deterministically (`SEED = 42`) from a biophysical allometric response function of ESA WorldCover canopy class and seasonal Sentinel-2 NDVI/NDRE trajectories, and cached in `services/mrv/tests/fixtures/sentinel2_window_cube.npz`.
- **Carbon Conversion Constant:** `TCO2E_PER_TON_AGB = 0.47 * (44 / 12) = 1.7233333333333334 tCO2e / Mg AGB` (IPCC 2006 / 2019 Refinement Guidelines for National Greenhouse Gas Inventories, Vol. 4 AFOLU, Ch. 4 Forest Land, Table 4.3).
