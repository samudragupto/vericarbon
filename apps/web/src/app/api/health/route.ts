import { NextResponse } from "next/server";
import {
  createBaseSepoliaPublicClient,
  DEFAULT_BASE_SEPOLIA_RPC_URL,
  HealthResponseSchema,
  type HealthResponse,
} from "@vericarbon/sdk";

/**
 * GET /api/health
 * Reports reachability and latency of both Supabase PostgREST and the configured
 * Base Sepolia / Anvil JSON-RPC endpoint, returning a Zod-validated `HealthResponse`.
 */
export async function GET(): Promise<NextResponse> {
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "http://127.0.0.1:54321"
  ).replace(/\/+$/, "");
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "local-anon-key";
  const rpcUrl =
    process.env.BASE_SEPOLIA_RPC_URL ??
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ??
    DEFAULT_BASE_SEPOLIA_RPC_URL;

  // 1. Check Supabase reachability
  const sbStart = Date.now();
  let sbReachable = false;
  let sbError: string | undefined;
  try {
    const sbRes = await fetch(
      `${supabaseUrl}/rest/v1/sync_log?select=id&limit=1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    sbReachable = sbRes.ok;
    if (!sbRes.ok) {
      sbError = `HTTP ${sbRes.status}`;
    }
  } catch (err) {
    sbReachable = false;
    sbError = err instanceof Error ? err.message : String(err);
  }
  const sbLatencyMs = Math.max(0, Date.now() - sbStart);

  // 1b. Keep-alive ping to Supabase Edge Function indexer runtime
  try {
    fetch(`${supabaseUrl}/functions/v1/indexer`, {
      method: "OPTIONS",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  } catch {
    // Non-blocking keep-alive ping
  }

  // 2. Check Base Sepolia / Anvil RPC reachability
  const rpcStart = Date.now();
  let rpcReachable = false;
  let rpcChainId: number | undefined;
  let rpcLatestBlock: string | undefined;
  let rpcError: string | undefined;
  try {
    const client = createBaseSepoliaPublicClient(rpcUrl);
    const [chainId, blockNumber] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
    rpcReachable = true;
    rpcChainId = chainId;
    rpcLatestBlock = blockNumber.toString();
  } catch (err) {
    rpcReachable = false;
    rpcError = err instanceof Error ? err.message : String(err);
  }
  const rpcLatencyMs = Math.max(0, Date.now() - rpcStart);

  const payload: HealthResponse = HealthResponseSchema.parse({
    status: sbReachable && rpcReachable ? "ok" : "degraded",
    supabase: {
      reachable: sbReachable,
      latencyMs: sbLatencyMs,
      ...(sbError ? { error: sbError } : {}),
    },
    rpc: {
      reachable: rpcReachable,
      latencyMs: rpcLatencyMs,
      ...(rpcChainId !== undefined ? { chainId: rpcChainId } : {}),
      ...(rpcLatestBlock !== undefined ? { latestBlock: rpcLatestBlock } : {}),
      ...(rpcError ? { error: rpcError } : {}),
    },
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(payload, {
    status: payload.status === "ok" ? 200 : 503,
  });
}

