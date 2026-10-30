import type { Address, Hex, Log } from "viem";
import {
  createBaseSepoliaPublicClient,
  decodeBeneficiaryCommitmentFromCalldata,
  decodeCarbonRegistryLog,
  DEFAULT_BASE_SEPOLIA_RPC_URL,
  DEPLOYMENT_ADDRESSES,
} from "./client.js";
import { SyncOnceResultSchema, type SyncOnceResult } from "./types.js";

export interface SyncOnceOptions {
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  rpcUrl?: string;
  registryAddress?: Address;
  useEdgeFunction?: boolean;
}

const ZERO_BYTES32: Hex =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 200,
): Promise<T> {
  let attempt = 0;
  let lastErr: unknown;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      lastErr = err;
      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`Failed after ${maxAttempts} attempts`);
}

interface SyncLogRow {
  id: number;
  chain_id: number;
  last_block: number | string;
}

/**
 * Triggers a single idempotent synchronization pass of `CarbonRegistry` events into Supabase.
 *
 * First attempts to invoke the Supabase Edge Function (`/functions/v1/indexer`) when
 * `useEdgeFunction` is true; if the Edge Function runtime is not serving or `useEdgeFunction`
 * is false, executes the identical `viem` log scan + atomic `ingest_indexer_batch` PostgREST RPC.
 */
export async function syncOnce(
  options: SyncOnceOptions = {},
): Promise<SyncOnceResult> {
  const supabaseUrl = (
    options.supabaseUrl ??
    "http://127.0.0.1:54321"
  ).replace(/\/+$/, "");
  const serviceKey = options.supabaseServiceRoleKey ?? "local-service-role";
  const rpcUrl = options.rpcUrl ?? DEFAULT_BASE_SEPOLIA_RPC_URL;
  const registryAddress = (options.registryAddress ??
    DEPLOYMENT_ADDRESSES.CarbonRegistry) as Address;

  if (options.useEdgeFunction !== false) {
    try {
      const edgeRes = await fetch(`${supabaseUrl}/functions/v1/indexer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          supabaseUrl,
          supabaseServiceRoleKey: serviceKey,
          rpcUrl,
          registryAddress,
        }),
      });
      if (edgeRes.ok) {
        const edgeJson = await edgeRes.json();
        return SyncOnceResultSchema.parse(edgeJson);
      }
    } catch {
      // Fall through to direct PostgREST + viem execution
    }
  }

  // 1. Read sync_log watermark from PostgREST
  const syncRes = await fetch(
    `${supabaseUrl}/rest/v1/sync_log?id=eq.1&select=id,chain_id,last_block`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  );

  if (!syncRes.ok) {
    const errText = await syncRes.text();
    throw new Error(`Failed to read sync_log (${syncRes.status}): ${errText}`);
  }

  const syncRows = (await syncRes.json()) as SyncLogRow[];
  const lastBlock =
    syncRows.length > 0 && syncRows[0] !== undefined
      ? BigInt(syncRows[0].last_block)
      : 0n;

  const client = createBaseSepoliaPublicClient(rpcUrl);
  const chainId = await withBackoff(() => client.getChainId());
  const latestBlock = await withBackoff(() => client.getBlockNumber());
  const fromBlock = lastBlock === 0n ? 0n : lastBlock + 1n;

  if (fromBlock > latestBlock) {
    return SyncOnceResultSchema.parse({
      ok: true,
      chainId,
      fromBlock: Number(fromBlock),
      toBlock: Number(latestBlock),
      projectsUpserted: 0,
      issuancesUpserted: 0,
      claimsUpserted: 0,
      nullifiersUpserted: 0,
    });
  }

  const rawLogs: Log[] = await withBackoff(() =>
    client.getLogs({
      address: registryAddress,
      fromBlock,
      toBlock: latestBlock,
    }),
  );

  const projects: Array<Record<string, unknown>> = [];
  const issuances: Array<Record<string, unknown>> = [];
  const claims: Array<Record<string, unknown>> = [];
  const nullifiers: Array<Record<string, unknown>> = [];

  for (const rawLog of rawLogs) {
    const decoded = decodeCarbonRegistryLog(rawLog);
    if (!decoded) {
      continue;
    }

    if (decoded.eventName === "ProjectRegistered") {
      projects.push({
        project_id: decoded.projectId,
        geo_commitment: decoded.geoCommitment,
        evidence_cid: decoded.evidenceCid,
        registry_address: decoded.registrar,
        tx_hash: decoded.txHash,
        log_index: decoded.logIndex,
        block_number: Number(decoded.blockNumber),
      });
    } else if (decoded.eventName === "Issued") {
      issuances.push({
        issuance_nullifier: decoded.issuanceNullifier,
        project_id: decoded.projectId,
        amount: decoded.amount.toString(),
        vintage_year: decoded.vintageYear,
        credit_type: decoded.creditType,
        tx_hash: decoded.txHash,
        log_index: decoded.logIndex,
        block_number: Number(decoded.blockNumber),
      });
      nullifiers.push({
        nullifier: decoded.issuanceNullifier,
        kind: "issuance",
        spent: true,
        first_seen_tx: decoded.txHash,
        log_index: decoded.logIndex,
        block_number: Number(decoded.blockNumber),
      });
    } else if (decoded.eventName === "Claimed") {
      let beneficiaryCommitment: Hex = ZERO_BYTES32;
      try {
        const tx = await withBackoff(() =>
          client.getTransaction({ hash: decoded.txHash }),
        );
        beneficiaryCommitment = decodeBeneficiaryCommitmentFromCalldata(tx.input);
      } catch {
        beneficiaryCommitment = ZERO_BYTES32;
      }

      claims.push({
        claim_nullifier: decoded.claimNullifier,
        serial_ids: decoded.serialIds.map((id) => Number(id)),
        claim_type: decoded.claimType,
        beneficiary_commitment: beneficiaryCommitment,
        tx_hash: decoded.txHash,
        log_index: decoded.logIndex,
        block_number: Number(decoded.blockNumber),
      });
      nullifiers.push({
        nullifier: decoded.claimNullifier,
        kind: "claim",
        spent: true,
        first_seen_tx: decoded.txHash,
        log_index: decoded.logIndex,
        block_number: Number(decoded.blockNumber),
      });
    }
  }

  const rpcIngestRes = await fetch(
    `${supabaseUrl}/rest/v1/rpc/ingest_indexer_batch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        p_chain_id: chainId,
        p_last_block: Number(latestBlock),
        p_projects: projects,
        p_issuances: issuances,
        p_claims: claims,
        p_nullifiers: nullifiers,
      }),
    },
  );

  if (!rpcIngestRes.ok) {
    const errText = await rpcIngestRes.text();
    throw new Error(
      `ingest_indexer_batch RPC failed (${rpcIngestRes.status}): ${errText}`,
    );
  }

  return SyncOnceResultSchema.parse({
    ok: true,
    chainId,
    fromBlock: Number(fromBlock),
    toBlock: Number(latestBlock),
    projectsUpserted: projects.length,
    issuancesUpserted: issuances.length,
    claimsUpserted: claims.length,
    nullifiersUpserted: nullifiers.length,
  });
}

