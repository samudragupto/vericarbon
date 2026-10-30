import Link from "next/link";
import { Trees, ExternalLink, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950/90 text-xs text-zinc-500 py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 text-zinc-400 font-medium">
            <Trees className="h-4 w-4 text-emerald-500" />
            <span>VeriCarbon Research Prototype</span>
          </div>
          <span className="hidden sm:inline text-zinc-700">•</span>
          <span>Zero-Knowledge MRV with Cross-Registry Nullifiers</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-zinc-400">
          <span className="text-[11px] text-zinc-500">
            Map tiles:{" "}
            <a
              href="https://carto.com/attributions"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 underline hover:text-emerald-400"
            >
              © CARTO
            </a>
            , data{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 underline hover:text-emerald-400"
            >
              © OpenStreetMap
            </a>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="text-[11px] text-zinc-500">
            Biomass: IPCC 2006/2019 Refinement (1.723 tCO2e/t AGB)
          </span>
          <span className="text-zinc-700">•</span>
          <Link
            href="/api/health"
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
            target="_blank"
          >
            <ShieldCheck className="h-3 w-3" />
            API Health
          </Link>
        </div>
      </div>
    </footer>
  );
}

