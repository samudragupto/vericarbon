import { cn } from "@/lib/utils";

export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div
        className={cn(
          "max-w-2xl rounded-lg border bg-card p-8 text-card-foreground shadow-sm"
        )}
      >
        <div className="mb-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-primary">
          Phase 1 Scaffold • Base Sepolia (84532)
        </div>
        <h1 className="text-3xl font-bold tracking-tight">VeriCarbon</h1>
        <p className="mt-3 text-muted-foreground">
          Zero-knowledge verifiable MRV prototype for carbon credit markets.
          Combines satellite-derived biomass estimation (ezkl Halo2 proofs) with
          cross-registry geospatial issuance and claim nullifiers.
        </p>
      </div>
    </main>
  );
}

