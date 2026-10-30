import React from "react";
import { Satellite, Cpu, ShieldCheck, Database, Layers, ArrowRight } from "lucide-react";

export function ArchitectureDiagram() {
  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-800/80">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            VeriCarbon Zero-Knowledge MRV Architecture
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            End-to-end verifiable pipeline from raw Sentinel-2 L2A chips to on-chain cross-registry nullifier settlement.
          </p>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 border border-zinc-700/60 bg-zinc-900 px-2.5 py-1 rounded">
          Halo2 / KZG on BN254
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {/* Step 1: Satellite & STAC */}
        <div className="flex flex-col p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-600/50 transition-all group">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Satellite className="h-5 w-5" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Step 1</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors">
            Sentinel-2 L2A STAC
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Planetary Computer STAC chips, cloud-filtered SCL, NDVI/NDRE seasonal time-series, ESA WorldCover.
          </p>
          <div className="mt-3 text-[10px] font-mono text-zinc-500 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
            geohash8 AOI + salt
          </div>
        </div>

        {/* Step 2: MRV Pipeline */}
        <div className="flex flex-col p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-600/50 transition-all group">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Layers className="h-5 w-5" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Step 2</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-cyan-300 transition-colors">
            Quantized MRV Model
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            HistGradientBoostingRegressor predicting AGB (Mg/ha), quantized integer features &amp; ONNX export.
          </p>
          <div className="mt-3 text-[10px] font-mono text-zinc-500 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
            IPCC 1.723 tCO2e/t AGB
          </div>
        </div>

        {/* Step 3: ezkl Prover */}
        <div className="flex flex-col p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-600/50 transition-all group">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Cpu className="h-5 w-5" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Step 3</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-300 transition-colors">
            ezkl ZK Witness
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            SNARK proof binding private features to public [modelHash, dataCommitment, amount].
          </p>
          <div className="mt-3 text-[10px] font-mono text-zinc-500 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
            0.56s proving time
          </div>
        </div>

        {/* Step 4: Smart Contracts */}
        <div className="flex flex-col p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-600/50 transition-all group">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Step 4</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors">
            CarbonRegistry
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            On-chain Halo2Verifier check, global issuanceNullifier check, ERC-1155 minting &amp; claim retirement.
          </p>
          <div className="mt-3 text-[10px] font-mono text-zinc-500 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
            Base Sepolia / Anvil
          </div>
        </div>

        {/* Step 5: Indexer & Explorer */}
        <div className="flex flex-col p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-600/50 transition-all group">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Database className="h-5 w-5" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Step 5</span>
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
            Audit &amp; Indexer
          </h4>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Supabase Edge Function indexer, IPFS evidence bundle viewer, double-issuance prevention audit.
          </p>
          <div className="mt-3 text-[10px] font-mono text-zinc-500 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
            Hourly pg_cron sync
          </div>
        </div>
      </div>
    </div>
  );
}

