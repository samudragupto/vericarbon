# VeriCarbon Reproducibility Manifest

All toolchains, random seeds, dataset snapshots, and exact package versions used to generate tables and figures in `paper/` are recorded here.

## Phase 1 Toolchain & Pinned Versions

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
- **`services/mrv`:** `typer==0.15.2`, `pytest==8.3.5`, `ruff==0.9.9`, `black==25.1.0`, `hatchling==1.27.0`
