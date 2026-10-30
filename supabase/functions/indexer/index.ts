// Supabase Edge Function (Deno / TypeScript): VeriCarbon On-Chain Event Indexer
// Polls BASE_SEPOLIA_RPC_URL with exponential backoff, decodes ProjectRegistered /
// Issued / Claimed events since sync_log.last_block, and atomically upserts rows
// into projects, issuances, claims, nullifiers, and sync_log.

import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  http,
  parseAbi,
  type Address,
  type Hex,
  type Log,
} from "https://esm.sh/viem@2.23.5";
import { baseSepolia } from "https://esm.sh/viem@2.23.5/chains";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CARBON_REGISTRY_EVENTS_ABI = parseAbi([
  "event ProjectRegistered(bytes32 indexed projectId, bytes32 indexed geoCommitment, address indexed registrar, string evidenceCid)",
  "event Issued(bytes32 indexed issuanceNullifier, bytes32 indexed projectId, uint256 amount, uint16 vintageYear, uint8 creditType, string evidenceCid)",
  "event Claimed(bytes32 indexed claimNullifier, uint256[] serialIds, uint8 claimType)",
  "function retire(uint256[] serialIds, uint8 claimType, bytes32 beneficiaryCommitment)",
  "function retireAmounts(uint256[] serialIds, uint256[] amounts, uint8 claimType, bytes32 beneficiaryCommitment)",
]);

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

interface StructuredLog {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  details: Record<string, unknown>;
}

function logJson(
  level: StructuredLog["level"],
  event: string,
  details: Record<string, unknown> = {},
): void {
  const entry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    event,
    details,
  };
  console.log(JSON.stringify(entry));
}

async function withExponentialBackoff<T>(
  operationName: string,
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 250,
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      lastError = err;
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      logJson("warn", "rpc_retry_backoff", {
        operationName,
        attempt,
        maxAttempts,
        delayMs,
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Operation ${operationName} failed after ${maxAttempts} attempts`);
}

interface ProjectRow {
  project_id: string;
  geo_commitment: string;
  evidence_cid: string;
  registry_address: string;
  tx_hash: string;
  log_index: number;
  block_number: number;
}

interface IssuanceRow {
  issuance_nullifier: string;
  project_id: string;
  amount: string;
  vintage_year: number;
  credit_type: number;
  tx_hash: string;
  log_index: number;
  block_number: number;
}

interface ClaimRow {
  claim_nullifier: string;
  serial_ids: number[];
  claim_type: number;
  beneficiary_commitment: string;
  tx_hash: string;
  log_index: number;
  block_number: number;
}

interface NullifierRow {
  nullifier: string;
  kind: "issuance" | "claim";
  spent: boolean;
  first_seen_tx: string;
  log_index: number;
  block_number: number;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method Not Allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    let bodyOverrides: Record<string, string | undefined> = {};
    if (req.method === "POST") {
      try {
        bodyOverrides = await req.json();
      } catch {
        bodyOverrides = {};
      }
    }

    const supabaseUrl =
      bodyOverrides.supabaseUrl ??
      Deno.env.get("SUPABASE_URL") ??
      "http://127.0.0.1:54321";
    const supabaseServiceRoleKey =
      bodyOverrides.supabaseServiceRoleKey ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";
    const rpcUrl =
      bodyOverrides.rpcUrl ??
      Deno.env.get("BASE_SEPOLIA_RPC_URL") ??
      "https://sepolia.base.org";
    const registryAddress = (bodyOverrides.registryAddress ??
      Deno.env.get("CARBON_REGISTRY_ADDRESS") ??
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as Address;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Read chain_id + last_block from sync_log (id = 1)
    const { data: syncRow, error: syncReadErr } = await supabase
      .from("sync_log")
      .select("id, chain_id, last_block")
      .eq("id", 1)
      .maybeSingle();

    if (syncReadErr) {
      logJson("error", "sync_log_read_failed", { error: syncReadErr.message });
      return new Response(
        JSON.stringify({ ok: false, error: syncReadErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl, { retryCount: 0, timeout: 10_000 }),
    });

    const chainId = await withExponentialBackoff("getChainId", () =>
      client.getChainId(),
    );
    const latestBlock = await withExponentialBackoff("getBlockNumber", () =>
      client.getBlockNumber(),
    );

    const lastBlock = syncRow ? BigInt(syncRow.last_block) : 0n;
    const fromBlock = lastBlock === 0n ? 0n : lastBlock + 1n;

    if (fromBlock > latestBlock) {
      logJson("info", "indexer_already_synced", {
        chainId,
        lastBlock: Number(lastBlock),
        latestBlock: Number(latestBlock),
      });
      return new Response(
        JSON.stringify({
          ok: true,
          chainId,
          fromBlock: Number(fromBlock),
          toBlock: Number(latestBlock),
          projectsUpserted: 0,
          issuancesUpserted: 0,
          claimsUpserted: 0,
          nullifiersUpserted: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch logs from CarbonRegistry since fromBlock with exponential backoff
    const rawLogs: Log[] = await withExponentialBackoff("getLogs", () =>
      client.getLogs({
        address: registryAddress,
        fromBlock,
        toBlock: latestBlock,
      }),
    );

    const projects: ProjectRow[] = [];
    const issuances: IssuanceRow[] = [];
    const claims: ClaimRow[] = [];
    const nullifiers: NullifierRow[] = [];

    for (const rawLog of rawLogs) {
      const txHash = (rawLog.transactionHash ?? ZERO_BYTES32) as Hex;
      const logIndex = Number(rawLog.logIndex ?? 0);
      const blockNumber = Number(rawLog.blockNumber ?? 0n);

      try {
        const decoded = decodeEventLog({
          abi: CARBON_REGISTRY_EVENTS_ABI,
          data: rawLog.data,
          topics: rawLog.topics,
        });

        if (decoded.eventName === "ProjectRegistered") {
          const args = decoded.args as {
            projectId: Hex;
            geoCommitment: Hex;
            registrar: Address;
            evidenceCid: string;
          };
          projects.push({
            project_id: args.projectId,
            geo_commitment: args.geoCommitment,
            evidence_cid: args.evidenceCid,
            registry_address: args.registrar,
            tx_hash: txHash,
            log_index: logIndex,
            block_number: blockNumber,
          });
        } else if (decoded.eventName === "Issued") {
          const args = decoded.args as {
            issuanceNullifier: Hex;
            projectId: Hex;
            amount: bigint;
            vintageYear: number;
            creditType: number;
            evidenceCid: string;
          };
          issuances.push({
            issuance_nullifier: args.issuanceNullifier,
            project_id: args.projectId,
            amount: args.amount.toString(),
            vintage_year: Number(args.vintageYear),
            credit_type: Number(args.creditType),
            tx_hash: txHash,
            log_index: logIndex,
            block_number: blockNumber,
          });
          nullifiers.push({
            nullifier: args.issuanceNullifier,
            kind: "issuance",
            spent: true,
            first_seen_tx: txHash,
            log_index: logIndex,
            block_number: blockNumber,
          });
        } else if (decoded.eventName === "Claimed") {
          const args = decoded.args as {
            claimNullifier: Hex;
            serialIds: readonly bigint[];
            claimType: number;
          };
          let beneficiaryCommitment: string = ZERO_BYTES32;
          try {
            const tx = await withExponentialBackoff("getTransaction", () =>
              client.getTransaction({ hash: txHash }),
            );
            const fnDecoded = decodeFunctionData({
              abi: CARBON_REGISTRY_EVENTS_ABI,
              data: tx.input,
            });
            if (fnDecoded.functionName === "retire") {
              beneficiaryCommitment = String(fnDecoded.args[2]);
            } else if (fnDecoded.functionName === "retireAmounts") {
              beneficiaryCommitment = String(fnDecoded.args[3]);
            }
          } catch {
            beneficiaryCommitment = ZERO_BYTES32;
          }

          claims.push({
            claim_nullifier: args.claimNullifier,
            serial_ids: args.serialIds.map((id) => Number(id)),
            claim_type: Number(args.claimType),
            beneficiary_commitment: beneficiaryCommitment,
            tx_hash: txHash,
            log_index: logIndex,
            block_number: blockNumber,
          });
          nullifiers.push({
            nullifier: args.claimNullifier,
            kind: "claim",
            spent: true,
            first_seen_tx: txHash,
            log_index: logIndex,
            block_number: blockNumber,
          });
        }
      } catch {
        // Ignore unrelated logs (e.g. ERC1155 TransferSingle / RoleGranted)
      }
    }

    // 3. Atomic transactional upsert via public.ingest_indexer_batch RPC
    const { error: rpcErr } = await supabase.rpc("ingest_indexer_batch", {
      p_chain_id: chainId,
      p_last_block: Number(latestBlock),
      p_projects: projects,
      p_issuances: issuances,
      p_claims: claims,
      p_nullifiers: nullifiers,
    });

    if (rpcErr) {
      logJson("error", "indexer_batch_upsert_failed", { error: rpcErr.message });
      return new Response(
        JSON.stringify({ ok: false, error: rpcErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    logJson("info", "indexer_sync_complete", {
      chainId,
      fromBlock: Number(fromBlock),
      toBlock: Number(latestBlock),
      projectsUpserted: projects.length,
      issuancesUpserted: issuances.length,
      claimsUpserted: claims.length,
      nullifiersUpserted: nullifiers.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        chainId,
        fromBlock: Number(fromBlock),
        toBlock: Number(latestBlock),
        projectsUpserted: projects.length,
        issuancesUpserted: issuances.length,
        claimsUpserted: claims.length,
        nullifiersUpserted: nullifiers.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logJson("error", "indexer_unhandled_error", { error: message });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
});
