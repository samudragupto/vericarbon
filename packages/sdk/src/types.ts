import { z } from "zod";
import type { Address, Hex } from "viem";

/**
 * Placeholder types and schemas for VeriCarbon domain primitives.
 *
 * Domain semantics per AGENT.md:
 * - geoCommitment := keccak256(abi.encode(geohash8, salt))
 * - issuanceNullifier := keccak256(abi.encode(geoCommitment, vintageYear, creditType))
 * - claimNullifier := keccak256(abi.encode(issuanceNullifier, claimant, claimType, beneficiaryCommitment))
 */

export const Bytes32Schema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Must be a 32-byte hex string");

export const Geohash8Schema = z
  .string()
  .length(8, "Geohash must be 8 characters");

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

