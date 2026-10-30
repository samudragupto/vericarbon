import { keccak256, stringToBytes } from "viem";
import { EvidenceBundleSchema, type EvidenceBundle } from "./types.js";

/**
 * Storage adapter interface for pinning and retrieving VeriCarbon MRV evidence bundles on IPFS.
 */
export interface IIpfsStore {
  /**
   * Pins a validated EvidenceBundle JSON object to IPFS and returns its content identifier (CID).
   */
  pinJson(bundle: EvidenceBundle): Promise<string>;

  /**
   * Fetches and Zod-validates an EvidenceBundle by its CID, or returns null if not found.
   */
  getJson(cid: string): Promise<EvidenceBundle | null>;
}

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function bytesToBase32(bytes: Uint8Array, length: number): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < bytes.length && output.length < length; i++) {
    value = (value << 8) | (bytes[i] ?? 0);
    bits += 8;
    while (bits >= 5 && output.length < length) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "a";
      bits -= 5;
    }
  }
  while (output.length < length) {
    output += "a";
  }
  return output;
}

/**
 * Computes a deterministic CIDv1-formatted identifier (`bafkrei...`) over the canonical JSON
 * representation of an EvidenceBundle for local/offline test reproducibility.
 */
export function computeDeterministicCid(bundle: EvidenceBundle): string {
  const validated = EvidenceBundleSchema.parse(bundle);
  const canonicalJson = JSON.stringify(validated);
  const digestHex = keccak256(stringToBytes(canonicalJson)).slice(2);
  const digestBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    digestBytes[i] = parseInt(digestHex.slice(i * 2, i * 2 + 2), 16);
  }
  return `bafkrei${bytesToBase32(digestBytes, 52)}`;
}

/**
 * Local in-memory implementation of `IIpfsStore` for deterministic offline testing and local dev.
 */
export class InMemoryIpfsStore implements IIpfsStore {
  private readonly store = new Map<string, EvidenceBundle>();

  constructor(initialBundles: ReadonlyArray<EvidenceBundle> = []) {
    for (const bundle of initialBundles) {
      const parsed = EvidenceBundleSchema.parse(bundle);
      const cid = computeDeterministicCid(parsed);
      this.store.set(cid, parsed);
    }
  }

  public async pinJson(bundle: EvidenceBundle): Promise<string> {
    const validated = EvidenceBundleSchema.parse(bundle);
    const cid = computeDeterministicCid(validated);
    this.store.set(cid, validated);
    return cid;
  }

  public async getJson(cid: string): Promise<EvidenceBundle | null> {
    const found = this.store.get(cid);
    if (!found) {
      return null;
    }
    return EvidenceBundleSchema.parse(found);
  }

  public size(): number {
    return this.store.size;
  }
}

export interface PinataIpfsStoreConfig {
  pinataJwt: string;
  gatewayUrl?: string;
  apiUrl?: string;
}

/**
 * Production Pinata free-tier implementation of `IIpfsStore`.
 */
export class PinataIpfsStore implements IIpfsStore {
  private readonly pinataJwt: string;
  private readonly gatewayUrl: string;
  private readonly apiUrl: string;

  constructor(config: PinataIpfsStoreConfig) {
    if (!config.pinataJwt || config.pinataJwt.trim().length === 0) {
      throw new Error("PinataIpfsStore requires a non-empty pinataJwt");
    }
    this.pinataJwt = config.pinataJwt;
    this.gatewayUrl = (config.gatewayUrl ?? "https://gateway.pinata.cloud").replace(
      /\/+$/,
      "",
    );
    this.apiUrl = (config.apiUrl ?? "https://api.pinata.cloud").replace(
      /\/+$/,
      "",
    );
  }

  public async pinJson(bundle: EvidenceBundle): Promise<string> {
    const validated = EvidenceBundleSchema.parse(bundle);
    const response = await fetch(`${this.apiUrl}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.pinataJwt}`,
      },
      body: JSON.stringify({
        pinataMetadata: {
          name: `vericarbon-evidence-${validated.aoiGeohash8}-${validated.vintageYear}`,
        },
        pinataContent: validated,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata pinJSONToIPFS failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { IpfsHash?: string };
    if (!payload.IpfsHash) {
      throw new Error("Pinata response missing IpfsHash");
    }
    return payload.IpfsHash;
  }

  public async getJson(cid: string): Promise<EvidenceBundle | null> {
    const response = await fetch(`${this.gatewayUrl}/ipfs/${encodeURIComponent(cid)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Pinata gateway fetch failed (${response.status})`);
    }

    const raw = await response.json();
    return EvidenceBundleSchema.parse(raw);
  }
}

let sharedInMemoryStore: InMemoryIpfsStore | null = null;

/**
 * Returns the shared `InMemoryIpfsStore` singleton (useful across Next.js route invocations in dev/tests).
 */
export function getSharedInMemoryIpfsStore(): InMemoryIpfsStore {
  if (!sharedInMemoryStore) {
    sharedInMemoryStore = new InMemoryIpfsStore();
  }
  return sharedInMemoryStore;
}

/**
 * Factory that creates a `PinataIpfsStore` when a real `pinataJwt` is configured,
 * or falls back to the shared `InMemoryIpfsStore` for offline testing and local dev.
 */
export function createIpfsStore(options?: {
  pinataJwt?: string;
  gatewayUrl?: string;
}): IIpfsStore {
  const jwt = options?.pinataJwt;
  if (
    jwt &&
    jwt.trim().length > 0 &&
    !jwt.startsWith("your-") &&
    jwt !== "placeholder"
  ) {
    return new PinataIpfsStore({
      pinataJwt: jwt,
      gatewayUrl: options?.gatewayUrl,
    });
  }
  return getSharedInMemoryIpfsStore();
}

