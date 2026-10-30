"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Layers,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface CounterStats {
  projectCount: number;
  totalCreditsIssued: number;
  spentNullifiersCount: number;
  totalClaimsCount: number;
}

export default function LandingPage() {
  const [stats, setStats] = useState<CounterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Query projects
        const { data: projects } = await supabase
          .from("projects")
          .select("project_id");

        // Query issuances
        const { data: issuances } = await supabase
          .from("issuances")
          .select("amount");

        // Query spent nullifiers
        const { data: nullifiers } = await supabase
          .from("nullifiers")
          .select("nullifier")
          .eq("spent", true);

        // Query claims
        const { data: claims } = await supabase
          .from("claims")
          .select("claim_nullifier");

        const totalCredits = (issuances ?? []).reduce(
          (acc, row) => acc + (Number(row.amount) || 0),
          0
        );

        setStats({
          projectCount: projects?.length ?? 0,
          totalCreditsIssued: totalCredits,
          spentNullifiersCount: nullifiers?.length ?? 0,
          totalClaimsCount: claims?.length ?? 0,
        });
      } catch (err) {
        console.error("Failed to load live counters:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-900 bg-radial from-emerald-950/20 via-zinc-950 to-zinc-950 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/80 bg-emerald-950/60 px-3.5 py-1 text-xs text-emerald-300 mb-6 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Verifiable MRV • Peer-Reviewed Research Architecture
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100 leading-[1.1]">
              Zero-Knowledge MRV with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Cross-Registry Nullifiers
              </span>
            </h1>

            {/* One-paragraph pitch */}
            <p className="mt-6 text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
              VeriCarbon solves the catastrophic double-issuance and double-counting failure modes of voluntary carbon markets by combining multi-spectral satellite remote sensing (Sentinel-2 L2A), client-side privacy-preserving commitments, verifiable machine learning inference (ezkl Halo2 on BN254), and EVM-enforced cryptographic nullifiers that permanently bind land boundaries and vintage years across disparate registries without relying on centralized trusted intermediaries.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/projects">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2">
                  <Globe className="h-4 w-4" />
                  Explore Projects Map
                </Button>
              </Link>
              <Link href="/console">
                <Button size="lg" variant="outline" className="border-zinc-700 hover:bg-zinc-900 text-zinc-200 font-medium gap-2">
                  <Cpu className="h-4 w-4" />
                  Registry Console
                </Button>
              </Link>
              <Link href="/nullifiers">
                <Button size="lg" variant="secondary" className="bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800 gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Nullifiers Explorer
                </Button>
              </Link>
            </div>
          </div>

          {/* Live Counters from Supabase */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Counter 1: Projects */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md hover:border-emerald-700/50 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span>REGISTERED PROJECTS</span>
                <Globe className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-100">
                {loading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <span>{stats?.projectCount ?? 0}</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Tapajós &amp; Amazonia chips
              </p>
            </div>

            {/* Counter 2: Credits Issued */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md hover:border-emerald-700/50 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span>VERIFIED CREDITS ISSUED</span>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-100 flex items-baseline gap-1.5">
                {loading ? (
                  <Skeleton className="h-9 w-28" />
                ) : (
                  <>
                    <span>{(stats?.totalCreditsIssued ?? 0).toLocaleString()}</span>
                    <span className="text-xs font-mono font-normal text-zinc-400">tCO2e</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Quantized HistGradientBoosting
              </p>
            </div>

            {/* Counter 3: Nullifiers Spent */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md hover:border-emerald-700/50 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span>NULLIFIERS RECORDED</span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-100">
                {loading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <span>{stats?.spentNullifiersCount ?? 0}</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Global double-issuance guards
              </p>
            </div>

            {/* Counter 4: Claims Retired */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-md hover:border-emerald-700/50 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span>RETIREMENT CLAIMS</span>
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-100">
                {loading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <span>{stats?.totalClaimsCount ?? 0}</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Double-counting prevented
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Diagram Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl w-full">
        <ArchitectureDiagram />

        {/* Verification & Benchmarks highlights */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Cross-Registry Immunity
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Nullifiers exclude registry identifiers: <code className="text-zinc-300 font-mono text-[11px]">keccak256(geoCommitment, vintage, type)</code>. Attempting to issue the same forest plot across Verra, Gold Standard, or any peer registry triggers EVM revert.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <Cpu className="h-4 w-4" />
              Sub-Second Laptop Proving
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Halo2 KZG circuit over BN254 with 4 trees &amp; depth 2 completes proof generation in <strong className="text-zinc-200">0.56s on consumer CPU</strong> with 4,032 byte proof size, eliminating high-performance compute barriers.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Layers className="h-4 w-4" />
              Auditable Evidence Bundles
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Every on-chain credit is bound to an immutable IPFS evidence bundle containing exact Sentinel-2 scene IDs, salt, and feature tensor hash, cryptographically tied to the smart contract verifier.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
