# VeriCarbon Deployment Guide

This guide details the deployment procedure for the VeriCarbon research prototype across the **$0 free-tier cloud stack** (Vercel Hobby, Supabase Free Tier, Base Sepolia Testnet, and Pinata IPFS).

> [!CAUTION]
> **RESEARCH PROTOTYPE ONLY — NEVER DEPLOY TO MAINNET**
> VeriCarbon is a research prototype accompanying an academic manuscript submitted to *Future Generation Computer Systems* (FGCS). It is engineered strictly for testnet evaluation (Base Sepolia `chainId: 84532`, local Anvil `chainId: 31337`). It must **NEVER** be deployed to Ethereum mainnet, Base mainnet, or any production financial environment. No real funds, carbon assets, or enterprise legal commitments should be committed to these contracts.

---

## 1. Prerequisites & Free-Tier Services

| Service | Tier | Purpose | Required Secrets / Config |
| :--- | :--- | :--- | :--- |
| **Base Sepolia** | Public L2 Testnet | Smart contract execution & nullifiers | `BASE_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY` (throwaway) |
| **Supabase** | Free Tier | Off-chain PostgreSQL 16 database | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Vercel** | Hobby | Web application hosting (`apps/web`) | Next.js deployment environment |
| **Pinata** | Free Tier | Off-chain MRV evidence bundle storage | `PINATA_JWT` (server-side only) |

---

## 2. Smart Contracts (Base Sepolia)

1. **Fund a Throwaway Testnet Wallet**:
   - Create a dedicated development wallet strictly for testnet usage.
   - Obtain Base Sepolia testnet ETH from a public faucet (e.g., Alchemy, QuickNode, or Superchain Faucet).
   - **Never store real funds in this address.**

2. **Deploy via Foundry**:
   ```bash
   cd packages/contracts
   export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
   export DEPLOYER_PRIVATE_KEY="0x..." # Throwaway private key
   forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
   ```

3. **Record Contract Addresses**:
   Update `apps/web/.env.local` and `packages/sdk` with the emitted deployment addresses:
   - `NEXT_PUBLIC_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_VERIFIER_ADDRESS`

---

## 3. Database & Indexer (Supabase Free Tier)

1. **Create Supabase Project**:
   Create a new project in the Supabase web dashboard.

2. **Apply Database Migrations**:
   Push the consolidated PostgreSQL schemas and Row Level Security (RLS) policies:
   ```bash
   supabase db push
   # or copy and execute the SQL files in supabase/migrations/ via the Supabase SQL Editor
   ```

3. **Deploy Edge Indexer or Run Indexer Worker**:
   Deploy the event-listening indexer to ingest `CarbonRegistry` events:
   ```bash
   supabase functions deploy indexer
   ```
   Or run the standalone Viem polling indexer on any serverless node.

---

## 4. IPFS Evidence Storage (Pinata Free Tier)

1. Generate an API Key with `pinFileToIPFS` permissions in the Pinata dashboard.
2. Configure `PINATA_JWT` in server-side runtime environments only.
3. **Security Note:** `PINATA_JWT` must **NEVER** be prefixed with `NEXT_PUBLIC_` or bundled in client-side code.

---

## 5. Web Application Hosting (Vercel Hobby)

1. **Import Monorepo into Vercel**:
   - Framework Preset: **Next.js**
   - Root Directory: `apps/web`
   - Build Command: `pnpm build`
   - Output Directory: `.next`

2. **Configure Environment Variables in Vercel**:
   ```env
   NEXT_PUBLIC_CHAIN_ID=84532
   NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
   NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
   NEXT_PUBLIC_VERIFIER_ADDRESS=0x...
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   SUPABASE_SERVICE_ROLE_KEY=ey...
   PINATA_JWT=ey...
   ```

3. **Keep-Alive Cron Configuration**:
   Supabase Free Tier projects pause after 7 days of API inactivity. VeriCarbon includes a Vercel Cron configuration (`vercel.json`) that pings the keep-alive route daily:
   ```json
   {
     "crons": [
       {
         "path": "/api/health",
         "schedule": "0 0 * * *"
       }
     ]
   }
   ```
   This daily ping queries `SELECT 1` against Supabase to keep the database active at zero cost.

---

## 6. Fixture Proofs & Research Reproducibility Note

The on-chain verification benchmarks and evaluation suites reported in the paper use reproducible synthetic satellite fixtures located at `services/mrv/tests/fixtures/evidence_bundle.json` and `services/zk/artifacts/`.

- The default circuit configuration (`num_trees = 4`, `tree_depth = 2`, `logrows = 13`) guarantees sub-second proving on a standard laptop CPU (`0.56 s`) and deployed bytecode within EVM Spurious Dragon limits (`18,007` bytes).
- A commercial production deployment would require an MPC trusted-setup ceremony for SRS generation, real-time STAC API ingestion with coordinate reference system (CRS) validation, and decentralized Oracle signing of raster data.
