# AGENT.md — VeriCarbon — SOURCE OF TRUTH (read before every task)

## What this is
VeriCarbon: a zero-knowledge verifiable MRV prototype for carbon credit markets.
This is a RESEARCH PROTOTYPE built for a peer-reviewed publication (Q1 target).
Correctness, reproducibility, and measured benchmarks matter more than features.
Every number that will appear in the paper must be regenerable by a script in `eval/`.

## Hard constraints (never violate)
1. **$0 total cost.** Free tiers only: Vercel Hobby, Supabase Free, public testnet RPCs,
   Pinata free tier, Microsoft Planetary Computer (free STAC API). No paid APIs, ever.
2. **Testnet only** (Base Sepolia, chainId 84532). Never mainnet, never real funds.
   Deployment key = throwaway wallet, loaded from env only.
3. **No secrets in git.** All external keys in `.env` (gitignored) + `.env.example` placeholders.
4. **Deterministic & reproducible.** Pin every dependency version; record exact versions in
   docs/REPRODUCIBILITY.md. Seed all randomness. Cache network data as small fixtures under
   `services/mrv/tests/fixtures/` so tests run offline.
5. **Scoped edits only.** Never modify files outside the current phase's stated scope.
6. **Never fabricate credentials or env values.** If a required key is missing, STOP and ask me.

## Stack (do not substitute without stating the reason in writing)
- Monorepo: pnpm workspaces + Turborepo
- Frontend: Next.js 15 (App Router, TypeScript strict), Tailwind CSS, shadcn/ui,
  wagmi v2 + viem v2, MapLibre GL with free Carto basemap tiles
- Contracts: Foundry (Solidity >=0.8.24), deploy target Base Sepolia (RPC https://sepolia.base.org)
- ZK: ezkl for verifiable inference (pin exact release; record it). circom+snarkjs optional.
- MRV/ML: Python 3.11, uv for env management, typer CLI, pystac-client + planetary-computer +
  rioxarray/xarray, scikit-learn HistGradientBoostingRegressor, ONNX export for ezkl
- Data (all free): Sentinel-2 L2A imagery; land cover from ESA WorldCover; biomass labels:
  prefer GEDI L4A AGB if available without friction on Planetary Computer, else ESA CCI Biomass;
  if neither is accessible without auth, build with small synthesized fixture data and log the
  limitation in docs/REPRODUCIBILITY.md
- DB/Auth: Supabase (local dev via supabase CLI + Docker; cloud free tier for deploy).
  All schema as SQL migrations. Row Level Security on every table.
- Indexer: Supabase Edge Function (Deno/TS) polling public RPC, scheduled by pg_cron (hourly),
  idempotent upsert keyed on (tx_hash, log_index)
- Storage: IPFS via Pinata free tier, always behind an adapter interface
- Serverless: Vercel Hobby (frontend + API routes; a daily cron ping to keep Supabase awake)

## Repo layout (create exactly this)
vericarbon/
├── apps/web/            # Next.js frontend + API routes
├── packages/contracts/  # Foundry: registry, nullifiers, ezkl verifier, tests, deploy
├── packages/sdk/        # shared TS types (zod), ABIs, viem clients, event decoding
├── services/mrv/        # Python pipeline: fetch -> features -> train -> quantify
├── services/zk/         # ezkl workspace: ONNX, settings, witness, proofs, compiled verifier
├── supabase/            # migrations/, functions/indexer/, seed.sql, config
├── eval/                # benchmark + fraud-simulation scripts, run_all.py, results/
├── paper/               # generated tables (.md) + figures (.png) for the manuscript
├── docs/                # ARCHITECTURE.md, REPRODUCIBILITY.md
└── AGENT.md

## Core domain semantics (the paper's headline — implement EXACTLY, do not "improve")
- geoCommitment := keccak256(abi.encode(geohash8, salt))   // salt created client-side,
  disclosed inside the evidence bundle on IPFS
- issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))
  NOTE: deliberately EXCLUDES registryId — a cross-registry collision is the FEATURE.
  Issuing the same land + vintage in any two registries must revert.
- claimNullifier := keccak256(abi.encode(issuanceNullifier, claimant, claimType,
  beneficiaryCommitment)); recorded once at retirement/claim; replay must revert.
- Issuance requires a valid ezkl proof. Public inputs: [modelHash, dataCommitment,
  claimedAmount]. Statement proved: claimedAmount <= model(preimage(dataCommitment))
  computed in fixed point. Verified on-chain via the ezkl-generated verifier contract.

## Coding standards
- TS: strict mode, no `any`, zod-validated API responses, ESLint + Prettier
- Solidity: natSpec on every external function; fuzz + invariant tests in forge;
  gas snapshots exported to eval/
- Python: ruff + black, full type hints, CLI via typer
- Every phase ends with: builds passing, tests passing, docs touched where relevant,
  git commit with a conventional-commit message.

## Definition of done for ANY task
`pnpm turbo build && pnpm turbo test` pass from repo root; `forge test -vvv` passes in
packages/contracts; new behavior is covered by tests. Any deviation from this file must be
reported explicitly in the final walkthrough — never silently.