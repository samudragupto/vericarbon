import { z } from "zod";
import type { Address, Hex } from "viem";

/**
 * Shared types and Zod schemas for VeriCarbon domain primitives and MRV evidence bundles.
 *
 * Domain semantics per AGENT.md:
 * - geoCommitment := keccak256(abi.encode(geohash8, salt))
 * - issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))
 * - claimNullifier := keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))
 */

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
  creditType: z.number().int().nonnegative(),
});

export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;

export const IssuanceCommitmentSchema = z.object({
  geohash8: Geohash8Schema,
  salt: Bytes32Schema,
  geoCommitment: Bytes32Schema,
  vintageYear: z.number().int().min(2000).max(2100),
  creditType: z.number().int().nonnegative(),
  issuanceNullifier: Bytes32Schema,
});

export type IssuanceCommitment = z.infer<typeof IssuanceCommitmentSchema>;

export interface VeriCarbonContractConfig {
  chainId: 84532;
  registryAddress: Address;
  verifierAddress: Address;
}

export type Bytes32Hex = Hex;
