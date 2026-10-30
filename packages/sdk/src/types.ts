import { z } from "zod";
import type { Address, Hex } from "viem";

/**
 * Shared types and Zod schemas for VeriCarbon domain primitives, MRV evidence bundles,
 * API responses, and indexer synchronization.
 *
 * Domain semantics per AGENT.md (AMENDMENT A0):
 * - geoCommitment := keccak256(abi.encode(geohash8, salt))
 * - issuanceNullifier := keccak256(abi.encode(geohash8, vintageYear, creditType))
 * - claimNullifier := keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))
 */

export enum CreditType {
  REMOVAL = 0,
  REDUCTION = 1,
}

export const CreditTypeSchema = z.nativeEnum(CreditType);

export const Bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Must be a 0x-prefixed 32-byte hex string");

export const Geohash8Schema = z
  .string()
  .length(8, "Geohash8 must be exactly 8 characters")
  .regex(/^[0-9bcdefghjkmnpqrstuvwxyz]{8}$/, "Invalid base32 geohash characters");

export const FeatureSummaryStatSchema = z.object({
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  std: z.number(),
});

export type FeatureSummaryStat = z.infer<typeof FeatureSummaryStatSchema>;

export const EvidenceBundleSchema = z.object({
  bundleVersion: z.string().min(1),
  projectId: z.string().optional(),
  aoiGeohash8: Geohash8Schema,
  salt: Bytes32Schema,
  sceneIds: z.array(z.string().min(1)).min(1),
  featureStats: z.record(z.string(), FeatureSummaryStatSchema),
  dataCommitment: Bytes32Schema,
  modelHash: Bytes32Schema,
  quantizedFeatures: z.union([
    z.array(z.number().int()),
    z.array(z.array(z.number().int())),
  ]),
  predictedCredits: z.number().nonnegative(),
  vintageYear: z.number().int().min(2000).max(2100),
  creditType: z.union([CreditTypeSchema, z.number().int().min(0).max(1)]),
});

export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;

export const IssuanceCommitmentSchema = z.object({
  geohash8: Geohash8Schema,
  salt: Bytes32Schema,
  geoCommitment: Bytes32Schema,
  vintageYear: z.number().int().min(2000).max(2100),
  creditType: z.union([CreditTypeSchema, z.number().int().min(0).max(1)]),
  issuanceNullifier: Bytes32Schema,
});

export type IssuanceCommitment = z.infer<typeof IssuanceCommitmentSchema>;

export const PinEvidenceResponseSchema = z.object({
  cid: z.string().min(1),
});

export type PinEvidenceResponse = z.infer<typeof PinEvidenceResponseSchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  supabase: z.object({
    reachable: z.boolean(),
    latencyMs: z.number().nonnegative(),
    error: z.string().optional(),
  }),
  rpc: z.object({
    reachable: z.boolean(),
    chainId: z.number().int().optional(),
    latestBlock: z.string().optional(),
    latencyMs: z.number().nonnegative(),
    error: z.string().optional(),
  }),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const SyncOnceResultSchema = z.object({
  ok: z.boolean(),
  chainId: z.number().int(),
  fromBlock: z.number().int().nonnegative(),
  toBlock: z.number().int().nonnegative(),
  projectsUpserted: z.number().int().nonnegative(),
  issuancesUpserted: z.number().int().nonnegative(),
  claimsUpserted: z.number().int().nonnegative(),
  nullifiersUpserted: z.number().int().nonnegative(),
});

export type SyncOnceResult = z.infer<typeof SyncOnceResultSchema>;

export interface VeriCarbonContractConfig {
  chainId: 84532;
  registryAddress: Address;
  verifierAddress: Address;
}

export type Bytes32Hex = Hex;
