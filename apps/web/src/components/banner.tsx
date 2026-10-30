"use client";

import { useAccount, useChainId } from "wagmi";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export function TestnetBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-900/60 bg-amber-950/90 px-4 py-1.5 text-xs text-amber-300 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <span>
          <strong className="font-semibold text-amber-200">RESEARCH PROTOTYPE TESTNET:</strong>{" "}
          Operating on Base Sepolia (Chain ID 84532) & Local Anvil (Chain ID 31337). No real-world funds.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-900/50 px-2 py-0.5 font-mono text-[11px] text-amber-200 border border-amber-800/60">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          Active: {chainId === 31337 ? "Anvil (31337)" : chainId === 84532 ? "Base Sepolia (84532)" : `Chain ${chainId || "84532"}`}
        </span>
      </div>
    </div>
  );
}

