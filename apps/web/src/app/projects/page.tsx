"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { decodeGeohash } from "@/lib/geohash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  Globe,
  Search,
  ExternalLink,
  ShieldCheck,
  Trees,
  Filter,
  FileCode,
  ArrowRight,
} from "lucide-react";
import type { MapPin } from "@/components/map-view";

const MapView = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[450px] w-full rounded-xl border border-zinc-800" />
    ),
  }
);

interface ProjectRecord {
  project_id: string;
  geo_commitment: string;
  evidence_cid: string;
  registry_address: string;
  block_number: number;
  created_at: string;
  issuance_count?: number;
}

const DEMO_PROJECTS: ProjectRecord[] = [
  {
    project_id: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    geo_commitment: "0x6z2zz00000000000000000000000000000000000000000000000000000000000",
    evidence_cid: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    registry_address: "0x2ab745F51002Ce236A9A2dA81cDaA553B87f28CD",
    block_number: 1428570,
    created_at: new Date().toISOString(),
    issuance_count: 1,
  },
  {
    project_id: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    geo_commitment: "0x6z3pb00000000000000000000000000000000000000000000000000000000000",
    evidence_cid: "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
    registry_address: "0x2ab745F51002Ce236A9A2dA81cDaA553B87f28CD",
    block_number: 1428585,
    created_at: new Date().toISOString(),
    issuance_count: 0,
  },
  {
    project_id: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
    geo_commitment: "0x6z8bp00000000000000000000000000000000000000000000000000000000000",
    evidence_cid: "bafybeicg2ggtcuhscfqqym4it2scfh3v6zfnqg3bkjr7evk6uquz24gup4",
    registry_address: "0x2ab745F51002Ce236A9A2dA81cDaA553B87f28CD",
    block_number: 1428590,
    created_at: new Date().toISOString(),
    issuance_count: 2,
  },
  {
    project_id: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
    geo_commitment: "0x6z90000000000000000000000000000000000000000000000000000000000000",
    evidence_cid: "bafybeihkovi6ugzbf52w3vwhgq5u435y7s2f7h4f2y24hvdz6e5yq6j6le",
    registry_address: "0x2ab745F51002Ce236A9A2dA81cDaA553B87f28CD",
    block_number: 1428610,
    created_at: new Date().toISOString(),
    issuance_count: 1,
  },
];

export default function ProjectsExplorerPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>(DEMO_PROJECTS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { error: toastError } = useToast();

  useEffect(() => {
    async function loadProjects() {
      try {
        const [projectsRes, issuancesRes] = await Promise.all([
          supabase
            .from("projects")
            .select("*")
            .order("block_number", { ascending: false }),
          supabase
            .from("issuances")
            .select("project_id"),
        ]);

        const data = projectsRes.data;
        if (!data || data.length === 0) {
          // Keep instant demo fixtures if Supabase is offline or empty
          return;
        }

        const issuanceMap = new Map<string, number>();
        (issuancesRes.data ?? []).forEach((iss) => {
          issuanceMap.set(iss.project_id, (issuanceMap.get(iss.project_id) ?? 0) + 1);
        });

        const enriched = data.map((p) => ({
          ...p,
          issuance_count: issuanceMap.get(p.project_id) ?? 0,
        }));

        setProjects(enriched);
      } catch {
        // Keep demo projects on network fetch error
      }
    }

    loadProjects();
  }, [toastError]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.project_id.toLowerCase().includes(q) ||
        p.evidence_cid.toLowerCase().includes(q) ||
        p.geo_commitment.toLowerCase().includes(q) ||
        p.registry_address.toLowerCase().includes(q)
    );
  }, [projects, search]);

  // Construct map pins around Tapajós National Forest chip
  const pins: MapPin[] = useMemo(() => {
    return filteredProjects.map((p, idx) => {
      // Tapajós National Forest center: -2.8125, -54.8437
      // If we don't have exact geohash encoded in string, create deterministic scatter
      const hashInt = parseInt(p.project_id.slice(2, 8), 16) || idx;
      const latOffset = ((hashInt % 100) - 50) * 0.001;
      const lonOffset = (((hashInt >> 4) % 100) - 50) * 0.001;

      return {
        id: p.project_id,
        latitude: -2.8125 + latOffset,
        longitude: -54.8437 + lonOffset,
        title: `Project ${p.project_id.slice(0, 10)}...`,
        description: `Registrar: ${p.registry_address.slice(0, 8)}... | Block #${p.block_number}`,
        badge: `${p.issuance_count ?? 0} Issuances`,
        onClick: () => setSelectedProjectId(p.project_id),
      };
    });
  }, [filteredProjects]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
            <Globe className="h-6 w-6 text-emerald-400" />
            Projects Explorer
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Geospatial AOI pins, on-chain commitments, and IPFS evidence bundles indexed from Base Sepolia.
          </p>
        </div>
        <Link href="/console">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
            <Trees className="h-4 w-4" />
            Register New Project
          </Button>
        </Link>
      </div>

      {/* Map Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Interactive Spatial AOI Pins ({pins.length} active)
          </span>
          <span className="text-[11px] text-zinc-500">
            Click pin to focus project details
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-[450px] w-full rounded-xl" />
        ) : (
          <MapView
            pins={pins}
            selectedPinId={selectedProjectId}
            className="h-[450px] w-full"
          />
        )}
      </div>

      {/* Filterable Table Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by project ID, geo commitment, or registrar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-sm"
            />
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            Showing {filteredProjects.length} of {projects.length} projects
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-950/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3 font-medium">Project ID</th>
                  <th className="px-4 py-3 font-medium">Geo Commitment</th>
                  <th className="px-4 py-3 font-medium">Evidence CID</th>
                  <th className="px-4 py-3 font-medium">Registrar</th>
                  <th className="px-4 py-3 font-medium">Block</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
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
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 font-sans">
                      <div className="flex flex-col items-center gap-2">
                        <Trees className="h-8 w-8 text-zinc-700" />
                        <span className="text-sm">No projects found matching query</span>
                        <span className="text-xs text-zinc-600">
                          Register a new project in the Registry Console to populate this table.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const isSelected = p.project_id === selectedProjectId;
                    return (
                      <tr
                        key={p.project_id}
                        className={`hover:bg-zinc-900/60 transition-colors ${
                          isSelected ? "bg-emerald-950/30 border-l-2 border-emerald-400" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-400">
                              {p.project_id.slice(0, 10)}...{p.project_id.slice(-6)}
                            </span>
                            {p.issuance_count && p.issuance_count > 0 ? (
                              <Badge variant="default" className="text-[10px] py-0 px-1.5">
                                {p.issuance_count} issued
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400">
                          {p.geo_commitment.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-zinc-400 truncate block max-w-[140px]" title={p.evidence_cid}>
                            {p.evidence_cid.slice(0, 12)}...{p.evidence_cid.slice(-6)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-zinc-400">
                          {p.registry_address.slice(0, 6)}...{p.registry_address.slice(-4)}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-500">
                          #{p.block_number}
                        </td>
                        <td className="px-4 py-3.5 text-right font-sans">
                          <Link href={`/projects/${encodeURIComponent(p.project_id)}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-800">
                              View Details
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
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
    </div>
  );
}

