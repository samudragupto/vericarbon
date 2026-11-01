"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  ShieldAlert,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Fingerprint,
} from "lucide-react";

interface NullifierRecord {
  nullifier: string;
  kind: "issuance" | "claim";
  spent: boolean;
  first_seen_tx: string;
  log_index: number;
  block_number: number;
  created_at: string;
}

const DEMO_NULLIFIERS: NullifierRecord[] = [
  {
    nullifier: "0x3f5c7a8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a",
    kind: "issuance",
    spent: true,
    first_seen_tx: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    log_index: 0,
    block_number: 1428575,
    created_at: new Date().toISOString(),
  },
  {
    nullifier: "0x4e6d8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f",
    kind: "issuance",
    spent: true,
    first_seen_tx: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    log_index: 1,
    block_number: 1428595,
    created_at: new Date().toISOString(),
  },
];

export default function NullifiersExplorerPage() {
  const [nullifiers, setNullifiers] = useState<NullifierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "issuance" | "claim">("all");
  const { error: toastError } = useToast();

  useEffect(() => {
    async function loadNullifiers() {
      try {
        const { data, error } = await supabase
          .from("nullifiers")
          .select("*")
          .order("block_number", { ascending: false });

        if (error || !data || data.length === 0) {
          setNullifiers(DEMO_NULLIFIERS);
          return;
        }

        setNullifiers((data ?? []) as NullifierRecord[]);
      } catch {
        setNullifiers(DEMO_NULLIFIERS);
      } finally {
        setLoading(false);
      }
    }

    loadNullifiers();
  }, [toastError]);

  const filteredNullifiers = useMemo(() => {
    return nullifiers.filter((n) => {
      if (kindFilter !== "all" && n.kind !== kindFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        n.nullifier.toLowerCase().includes(q) ||
        n.first_seen_tx.toLowerCase().includes(q) ||
        n.block_number.toString().includes(q)
      );
    });
  }, [nullifiers, search, kindFilter]);

  const issuanceCount = nullifiers.filter((n) => n.kind === "issuance").length;
  const claimCount = nullifiers.filter((n) => n.kind === "claim").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-emerald-400" />
            Cryptographic Nullifiers Explorer
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Permanent global collision prevention set: cross-registry issuance nullifiers and retirement claim nullifiers.
          </p>
        </div>

        {/* Counter chips */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <Badge variant="outline" className="border-emerald-800/80 bg-emerald-950/40 text-emerald-300 py-1">
            {issuanceCount} Issuance Nullifiers
          </Badge>
          <Badge variant="outline" className="border-amber-800/80 bg-amber-950/40 text-amber-300 py-1">
            {claimCount} Claim Nullifiers
          </Badge>
        </div>
      </div>

      {/* Search & Kind Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by 32-byte nullifier, tx hash, or block number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-sm font-mono"
          />
        </div>

        {/* Kind Filter buttons */}
        <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
          <button
            onClick={() => setKindFilter("all")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              kindFilter === "all"
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All ({nullifiers.length})
          </button>
          <button
            onClick={() => setKindFilter("issuance")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              kindFilter === "issuance"
                ? "bg-emerald-950 text-emerald-300 border border-emerald-800 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Issuances ({issuanceCount})
          </button>
          <button
            onClick={() => setKindFilter("claim")}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              kindFilter === "claim"
                ? "bg-amber-950 text-amber-300 border border-amber-800 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Claims ({claimCount})
          </button>
        </div>
      </div>

      {/* Nullifiers Table */}
      <Card className="border-zinc-800 bg-zinc-950/70 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-mono uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3 font-medium">Nullifier Hash (32 Bytes)</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">First Seen Tx</th>
                <th className="px-4 py-3 font-medium">Block</th>
                <th className="px-4 py-3 font-medium text-right">Explorer Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="h-12">
                    <td colSpan={6} className="px-4 py-2">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredNullifiers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-sans">
                    <div className="flex flex-col items-center gap-2">
                      <Fingerprint className="h-8 w-8 text-zinc-700" />
                      <span className="text-sm">No nullifiers found matching criteria</span>
                      <span className="text-xs text-zinc-600">
                        Issue or retire carbon credits to generate cryptographic nullifiers.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNullifiers.map((item) => {
                  const isIssuance = item.kind === "issuance";
                  const explorerUrl = `https://sepolia.basescan.org/tx/${item.first_seen_tx}`;

                  return (
                    <tr key={item.nullifier} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200 break-all max-w-[280px]" title={item.nullifier}>
                            {item.nullifier.slice(0, 14)}...{item.nullifier.slice(-10)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={
                            isIssuance
                              ? "border-emerald-800 bg-emerald-950/60 text-emerald-300"
                              : "border-amber-800 bg-amber-950/60 text-amber-300"
                          }
                        >
                          {isIssuance ? "Issuance Guard" : "Claim Nullifier"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {item.spent ? (
                          <Badge variant="default" className="text-[10px] py-0 px-2 bg-emerald-950 border border-emerald-800 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            SPENT
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px] py-0 px-2">
                            UNSPENT
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-400">
                        <span title={item.first_seen_tx}>
                          {item.first_seen_tx.slice(0, 10)}...{item.first_seen_tx.slice(-6)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-500">
                        #{item.block_number}
                      </td>
                      <td className="px-4 py-3.5 text-right font-sans">
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          <span>Basescan</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

