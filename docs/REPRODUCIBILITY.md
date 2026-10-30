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
- **`packages/contracts`:** `forge-std@v1.11.0`, `@openzeppelin/contracts@5.2.0` (`solc 0.8.24`, `evm_version = "cancun"`, `optimizer = true`, `optimizer_runs = 200`)
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

## Phase 4 On-Chain Nullifier Registry & Fraud Evaluation (`packages/contracts`)

- **Contracts:**
  - `packages/contracts/src/CarbonRegistry.sol`: OpenZeppelin v5.2.0 `ERC1155` + `AccessControl` multi-registry carbon credit registry with global cross-registry geospatial nullifiers (`issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))`) and double-claim retirement nullifiers (`claimNullifier := keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))`).
  - `packages/contracts/src/baseline/BaselineCentralRegistry.sol`: Naive transfer-log baseline registry without a global geospatial nullifier set, demonstrating that cross-registry double-issuance of the same `(geoCommitment, vintageYear, creditType)` succeeds when `issuanceNullifier` is omitted.
  - `packages/contracts/script/Deploy.s.sol`: Deploys `Halo2Verifier`, `CarbonRegistry`, and `BaselineCentralRegistry` to Base Sepolia (`chainId: 84532`) and exports deployment manifests + ABIs to `packages/contracts/deployments/` and `packages/sdk/src/abi/`.
- **Deterministic Fuzz & Invariant Seeds:** `fuzz.runs = 128`, `fuzz.seed = "0x2a"`, `invariant.runs = 32`, `invariant.depth = 16`.
- **Gas Snapshot:** Saved in `eval/results/gas_snapshot.txt` via `forge snapshot --snap ../../eval/results/gas_snapshot.txt`.

## Phase 5 Supabase Schema, Indexer, IPFS Adapter, and Local E2E (`supabase/`, `packages/sdk`, `apps/web`, `eval/e2e_local.sh`)

- **Database Migrations & Seed (`supabase/`):**
  - `supabase/migrations/20261030000000_initial_schema.sql`: Idempotent SQL schema defining `pg_cron` and `pg_net` extensions, tables (`profiles`, `projects`, `issuances`, `claims`, `nullifiers`, `sync_log`), Row Level Security (RLS) policies on all tables (public `SELECT` on data tables, self-read/update on `profiles`, writes restricted to `service_role`), indexes on `project_id` and `block_number`, and the atomic transactional RPC `public.ingest_indexer_batch(...)`.
  - `supabase/migrations/20261030000001_indexer_cron.sql`: Schedules `indexer-hourly` (`0 * * * *`) via `cron.schedule` + `net.http_post`.
  - `supabase/seed.sql`: Seeds 2 demo registries, 3 projects, 3 issuances, 1 claim, 4 spent nullifiers, and the `sync_log` watermark.
  - `supabase/local_server.mjs`: Embedded PostgreSQL 16 (`@electric-sql/pglite@0.2.17`) PostgREST-compatible local gateway executing the exact `supabase/migrations/*.sql` and `supabase/seed.sql` files on port `54321` when the Supabase CLI Docker stack is not installed on the host.
- **Indexer & SDK (`supabase/functions/indexer/index.ts`, `packages/sdk`):**
  - `supabase/functions/indexer/index.ts`: Deno Edge Function using `viem@2.23.5` and `@supabase/supabase-js@2.49.1` with exponential backoff and structured JSON logging.
  - `packages/sdk`: Exports `IIpfsStore`, `PinataIpfsStore`, `InMemoryIpfsStore` (deterministic `bafkrei...` CIDv1 over canonical bundle JSON), `createBaseSepoliaPublicClient`, typed event decoders (`decodeProjectRegisteredLog`, `decodeIssuedLog`, `decodeClaimedLog`), and `syncOnce()`.
- **Web API Routes (`apps/web`):**
  - `POST /api/evidence`, `GET /api/evidence/[cid]`, `GET /api/health`, and `GET/POST /api/cron/indexer` (with daily Vercel cron schedule in `apps/web/vercel.json`).
- **End-to-End Local Verification (`eval/e2e_local.sh`):**
  - Starts local PostgreSQL 16 (applying migrations + `seed.sql`) and `anvil`, executes `forge script script/IssueLocal.s.sol:IssueLocalScript --broadcast` with the real Halo2 proof, runs `syncOnce()`, and verifies rows in `projects`, `issuances`, `claims`, and `nullifiers`.

## Phase 6 Frontend Web Application & Browser Verification (`apps/web`, `eval/results/screenshots`)

- **Tech Stack:**
  - Next.js 15.2.1 App Router with TypeScript strict mode
  - Tailwind CSS 3.4.17 + shadcn/ui dark research-demo theme
  - `wagmi@2.19.5` + `viem@2.38.0` configured for Base Sepolia (Chain ID 84532) and local Anvil (Chain ID 31337)
  - `maplibre-gl@6.16.0` with free CARTO Dark Matter basemap tiles (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`) and OpenStreetMap attribution
  - `@supabase/supabase-js@2.49.1` client with real-time counters and indexer synchronization
- **Pages Implemented:**
  1. `/` (Landing): One-paragraph pitch, architecture diagram, live counters from Supabase (`projects`, `issuances`, `nullifiers`, `claims`), quick links, and benchmark summary.
  2. `/projects` (Projects Explorer): Interactive MapLibre map with AOI project pins and a filterable table list.
  3. `/projects/[id]` (Project Details): Evidence bundle viewer (fetching from IPFS via `/api/evidence/[cid]`), issuance timeline, proof status badge, and an interactive "Verify Proof on-chain" button executing EVM Halo2 verification via wagmi.
  4. `/console` (Registry Console): Gated registry workflow for click-to-place map AOI geohash8 and client-side salt commitment generation, MRV quantify proof upload and credit issuance, and retirement claim nullifier generation.
  5. `/nullifiers` (Nullifiers Explorer): Searchable global nullifier table with spent/unspent badges, kind filter (issuance vs. claim), and Basescan explorer links.
- **Lighthouse Performance Score:** Audited via `lighthouse@13.6.0` on `http://127.0.0.1:3000/` landing page, achieving **95/100** (exceeding the >= 85 target).
- **Automated Browser Journey (`eval/run_browser_e2e.ps1` & `eval/e2e_browser_journey.mjs`):**
  - Automates local Anvil, local Supabase PGlite gateway, Next.js server, and headless Google Chrome.
  - Completes project registration, credit issuance with Halo2 proof fixture, spatial map pin rendering, token retirement, and nullifier verification.
  - Captures 5 high-resolution screenshots saved to `eval/results/screenshots/` and embedded in the walkthrough artifact.
