import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  http,
  parseAbi,
  type Address,
  type Hex,
  type HttpTransport,
  type Log,
  type PublicClient,
} from "viem";
import { baseSepolia } from "viem/chains";
import carbonRegistryAbiJson from "./abi/CarbonRegistry.json" with { type: "json" };
import baselineRegistryAbiJson from "./abi/BaselineCentralRegistry.json" with { type: "json" };
import halo2VerifierAbiJson from "./abi/Halo2Verifier.json" with { type: "json" };
import deploymentAddressesJson from "./abi/addresses.json" with { type: "json" };

export const BASE_SEPOLIA_CHAIN_ID = 84532 as const;
export const DEFAULT_BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";

export const CARBON_REGISTRY_ABI = carbonRegistryAbiJson;
export const BASELINE_CENTRAL_REGISTRY_ABI = baselineRegistryAbiJson;
export const HALO2_VERIFIER_ABI = halo2VerifierAbiJson;
export const DEPLOYMENT_ADDRESSES = deploymentAddressesJson;

export const CARBON_REGISTRY_EVENTS_ABI = parseAbi([
  "event ProjectRegistered(bytes32 indexed projectId, bytes32 indexed geoCommitment, address indexed registrar, string evidenceCid)",
  "event Issued(bytes32 indexed issuanceNullifier, bytes32 indexed projectId, uint256 amount, uint16 vintageYear, uint8 creditType, string evidenceCid)",
  "event Claimed(bytes32 indexed claimNullifier, uint256[] serialIds, uint8 claimType)",
  "function retire(uint256[] serialIds, uint8 claimType, bytes32 beneficiaryCommitment)",
  "function retireAmounts(uint256[] serialIds, uint256[] amounts, uint8 claimType, bytes32 beneficiaryCommitment)",
]);

/**
 * Creates a typed `viem` PublicClient for Base Sepolia (or a custom local Anvil RPC URL).
 */
export function createBaseSepoliaPublicClient(
  rpcUrl: string = DEFAULT_BASE_SEPOLIA_RPC_URL,
): PublicClient<HttpTransport, typeof baseSepolia> {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl, { retryCount: 2, timeout: 10_000 }),
  });
}

export interface DecodedProjectRegisteredEvent {
  eventName: "ProjectRegistered";
  projectId: Hex;
  geoCommitment: Hex;
  registrar: Address;
  evidenceCid: string;
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
}

export interface DecodedIssuedEvent {
  eventName: "Issued";
  issuanceNullifier: Hex;
  projectId: Hex;
  amount: bigint;
  vintageYear: number;
  creditType: number;
  evidenceCid: string;
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
}

export interface DecodedClaimedEvent {
  eventName: "Claimed";
  claimNullifier: Hex;
  serialIds: bigint[];
  claimType: number;
  txHash: Hex;
  logIndex: number;
  blockNumber: bigint;
}

export type DecodedCarbonRegistryEvent =
  | DecodedProjectRegisteredEvent
  | DecodedIssuedEvent
  | DecodedClaimedEvent;

const ZERO_BYTES32: Hex =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Decodes a raw `ProjectRegistered` log emitted by `CarbonRegistry`.
 */
export function decodeProjectRegisteredLog(
  rawLog: Pick<Log, "data" | "topics" | "transactionHash" | "logIndex" | "blockNumber">,
): DecodedProjectRegisteredEvent {
  const decoded = decodeEventLog({
    abi: CARBON_REGISTRY_EVENTS_ABI,
    eventName: "ProjectRegistered",
    data: rawLog.data,
    topics: rawLog.topics,
  });

  return {
    eventName: "ProjectRegistered",
    projectId: decoded.args.projectId,
    geoCommitment: decoded.args.geoCommitment,
    registrar: decoded.args.registrar,
    evidenceCid: decoded.args.evidenceCid,
    txHash: (rawLog.transactionHash ?? ZERO_BYTES32) as Hex,
    logIndex: Number(rawLog.logIndex ?? 0),
    blockNumber: rawLog.blockNumber ?? 0n,
  };
}

/**
 * Decodes a raw `Issued` log emitted by `CarbonRegistry`.
 */
export function decodeIssuedLog(
  rawLog: Pick<Log, "data" | "topics" | "transactionHash" | "logIndex" | "blockNumber">,
): DecodedIssuedEvent {
  const decoded = decodeEventLog({
    abi: CARBON_REGISTRY_EVENTS_ABI,
    eventName: "Issued",
    data: rawLog.data,
    topics: rawLog.topics,
  });

  return {
    eventName: "Issued",
    issuanceNullifier: decoded.args.issuanceNullifier,
    projectId: decoded.args.projectId,
    amount: decoded.args.amount,
    vintageYear: Number(decoded.args.vintageYear),
    creditType: Number(decoded.args.creditType),
    evidenceCid: decoded.args.evidenceCid,
    txHash: (rawLog.transactionHash ?? ZERO_BYTES32) as Hex,
    logIndex: Number(rawLog.logIndex ?? 0),
    blockNumber: rawLog.blockNumber ?? 0n,
  };
}

/**
 * Decodes a raw `Claimed` log emitted by `CarbonRegistry`.
 */
export function decodeClaimedLog(
  rawLog: Pick<Log, "data" | "topics" | "transactionHash" | "logIndex" | "blockNumber">,
): DecodedClaimedEvent {
  const decoded = decodeEventLog({
    abi: CARBON_REGISTRY_EVENTS_ABI,
    eventName: "Claimed",
    data: rawLog.data,
    topics: rawLog.topics,
  });

  return {
    eventName: "Claimed",
    claimNullifier: decoded.args.claimNullifier,
    serialIds: [...decoded.args.serialIds],
    claimType: Number(decoded.args.claimType),
    txHash: (rawLog.transactionHash ?? ZERO_BYTES32) as Hex,
    logIndex: Number(rawLog.logIndex ?? 0),
    blockNumber: rawLog.blockNumber ?? 0n,
  };
}

/**
 * Decodes any of the three `CarbonRegistry` core events (`ProjectRegistered`, `Issued`, `Claimed`),
 * returning `null` for unrelated logs (such as ERC1155 `TransferSingle` or `RoleGranted`).
 */
export function decodeCarbonRegistryLog(
  rawLog: Pick<Log, "data" | "topics" | "transactionHash" | "logIndex" | "blockNumber">,
): DecodedCarbonRegistryEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: CARBON_REGISTRY_EVENTS_ABI,
      data: rawLog.data,
      topics: rawLog.topics,
    });
    if (decoded.eventName === "ProjectRegistered") {
      return decodeProjectRegisteredLog(rawLog);
    }
    if (decoded.eventName === "Issued") {
      return decodeIssuedLog(rawLog);
    }
    if (decoded.eventName === "Claimed") {
      return decodeClaimedLog(rawLog);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decodes the `beneficiaryCommitment` argument from `retire` or `retireAmounts` transaction calldata.
 */
export function decodeBeneficiaryCommitmentFromCalldata(input: Hex): Hex {
  try {
    const decoded = decodeFunctionData({
      abi: CARBON_REGISTRY_EVENTS_ABI,
      data: input,
    });
    if (decoded.functionName === "retire") {
      return decoded.args[2];
    }
    if (decoded.functionName === "retireAmounts") {
      return decoded.args[3];
    }
    return ZERO_BYTES32;
  } catch {
    return ZERO_BYTES32;
  }
}
