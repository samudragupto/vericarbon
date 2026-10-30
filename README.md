# VeriCarbon

VeriCarbon is a zero-knowledge verifiable Monitoring, Reporting, and Verification (MRV) research prototype for carbon credit markets that pairs satellite-derived above-ground biomass inference (Sentinel-2 L2A and ESA WorldCover processed into an ONNX model proved via `ezkl` Halo2 circuits) with on-chain cross-registry geospatial issuance and claim nullifiers on Base Sepolia (`chainId: 84532`) to cryptographically prevent over-crediting, double issuance across registries, and double claiming without revealing raw plot coordinates on-chain.

## Per-Package Commands

| Package / Directory | Install / Setup | Build | Test / Run |
| :--- | :--- | :--- | :--- |
| **Root (Monorepo)** | `pnpm install` | `pnpm turbo build` | `pnpm turbo test` |
| **`apps/web`** | `pnpm --filter @vericarbon/web install` | `pnpm --filter @vericarbon/web build` | `pnpm --filter @vericarbon/web dev` |
| **`packages/sdk`** | `pnpm --filter @vericarbon/sdk install` | `pnpm --filter @vericarbon/sdk build` | `pnpm --filter @vericarbon/sdk test` |
| **`packages/contracts`** | `cd packages/contracts && forge build` | `cd packages/contracts && forge build` | `cd packages/contracts && forge test -vvv` |
| **`services/mrv`** | `cd services/mrv && uv sync` | `cd services/mrv && uv run ruff check . && uv run black --check .` | `cd services/mrv && uv run mrv hello && uv run pytest` |
| **`services/zk`** | See `services/zk/README.md` | `ezkl compile-circuit` (Phase 3) | `ezkl prove && ezkl verify` (Phase 3) |
| **`supabase/`** | `supabase start` | `supabase db reset` | `supabase functions serve indexer` |

