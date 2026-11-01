import { NextResponse } from "next/server";
import type { Address } from "viem";
import { syncOnce, SyncOnceResultSchema } from "@vericarbon/sdk";

/**
 * GET / POST /api/cron/indexer
 * Exposes the indexer synchronization over HTTPS for manual triggers and for the
 * daily Vercel cron keep-alive ping (`0 0 * * *`).
 */
async function handleTrigger(request: Request): Promise<NextResponse> {
  try {
    let overrides: Record<string, string | undefined> = {};
    if (request.method === "POST") {
      try {
        overrides = (await request.json()) as Record<string, string | undefined>;
      } catch {
        overrides = {};
      }
    }

    const result = await syncOnce({
      supabaseUrl:
        overrides.supabaseUrl ??
        process.env.SUPABASE_URL ??
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceRoleKey:
        overrides.supabaseServiceRoleKey ??
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        process.env.SUPABASE_SECRET_KEY,
      rpcUrl:
        overrides.rpcUrl ??
        process.env.BASE_SEPOLIA_RPC_URL ??
        process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
      registryAddress: (overrides.registryAddress ??
        process.env.NEXT_PUBLIC_CARBON_REGISTRY_ADDRESS ??
        process.env.NEXT_PUBLIC_VERICARBON_REGISTRY_ADDRESS) as Address | undefined,
    });

    return NextResponse.json(SyncOnceResultSchema.parse(result), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexer trigger failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  return handleTrigger(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handleTrigger(request);
}

