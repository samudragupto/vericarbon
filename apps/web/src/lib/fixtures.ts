import type { EvidenceBundle } from "@vericarbon/sdk";

export interface ProjectRecord {
  project_id: string;
  geo_commitment: string;
  evidence_cid: string;
  registry_address: string;
  block_number: number;
  created_at: string;
  issuance_count?: number;
}

export interface NullifierRecord {
  nullifier: string;
  kind: "issuance" | "claim";
  spent: boolean;
  first_seen_tx: string;
  log_index: number;
  block_number: number;
  created_at: string;
}

export interface IssuanceItem {
  issuance_nullifier: string;
  amount: number | string;
  vintage_year: number;
  credit_type: number;
  tx_hash: string;
  block_number: number;
  created_at: string;
}

/**
 * Seeded fixture dataset matching services/mrv/tests/fixtures and supabase/seed.sql.
 * Strictly used as deterministic fallback data — never freshly synthesized.
 */
export const SEEDED_FIXTURE_PROJECTS: ProjectRecord[] = [
  {
    project_id: "0x1000000000000000000000000000000000000000000000000000000000000001",
    geo_commitment: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f01",
    evidence_cid: "bafkreidemo1tapajos2024evidencebundle000000000000000000000001",
    registry_address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    block_number: 100,
    created_at: "2024-07-15T00:00:00.000Z",
    issuance_count: 1,
  },
  {
    project_id: "0x1000000000000000000000000000000000000000000000000000000000000002",
    geo_commitment: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f02",
    evidence_cid: "bafkreidemo2xingu2024evidencebundle00000000000000000000000002",
    registry_address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    block_number: 101,
    created_at: "2024-07-20T00:00:00.000Z",
    issuance_count: 1,
  },
  {
    project_id: "0x1000000000000000000000000000000000000000000000000000000000000003",
    geo_commitment: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f03",
    evidence_cid: "bafkreidemo3manaus2025evidencebundle0000000000000000000000003",
    registry_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    block_number: 102,
    created_at: "2024-08-01T00:00:00.000Z",
    issuance_count: 1,
  },
];

export const SEEDED_FIXTURE_NULLIFIERS: NullifierRecord[] = [
  {
    nullifier: "0x2000000000000000000000000000000000000000000000000000000000000001",
    kind: "issuance",
    spent: true,
    first_seen_tx: "0xbbb0000000000000000000000000000000000000000000000000000000000001",
    log_index: 1,
    block_number: 105,
    created_at: "2024-07-15T00:00:00.000Z",
  },
  {
    nullifier: "0x2000000000000000000000000000000000000000000000000000000000000002",
    kind: "issuance",
    spent: true,
    first_seen_tx: "0xbbb0000000000000000000000000000000000000000000000000000000000002",
    log_index: 1,
    block_number: 106,
    created_at: "2024-07-20T00:00:00.000Z",
  },
  {
    nullifier: "0x2000000000000000000000000000000000000000000000000000000000000003",
    kind: "issuance",
    spent: true,
    first_seen_tx: "0xbbb0000000000000000000000000000000000000000000000000000000000003",
    log_index: 1,
    block_number: 107,
    created_at: "2024-08-01T00:00:00.000Z",
  },
  {
    nullifier: "0x3000000000000000000000000000000000000000000000000000000000000001",
    kind: "claim",
    spent: true,
    first_seen_tx: "0xccc0000000000000000000000000000000000000000000000000000000000001",
    log_index: 2,
    block_number: 110,
    created_at: "2024-08-05T00:00:00.000Z",
  },
];

export const SEEDED_FIXTURE_ISSUANCES: Record<string, IssuanceItem[]> = {
  "0x1000000000000000000000000000000000000000000000000000000000000001": [
    {
      issuance_nullifier: "0x2000000000000000000000000000000000000000000000000000000000000001",
      amount: 544,
      vintage_year: 2024,
      credit_type: 0,
      tx_hash: "0xbbb0000000000000000000000000000000000000000000000000000000000001",
      block_number: 105,
      created_at: "2024-07-15T00:00:00.000Z",
    },
  ],
  "0x1000000000000000000000000000000000000000000000000000000000000002": [
    {
      issuance_nullifier: "0x2000000000000000000000000000000000000000000000000000000000000002",
      amount: 480,
      vintage_year: 2024,
      credit_type: 0,
      tx_hash: "0xbbb0000000000000000000000000000000000000000000000000000000000002",
      block_number: 106,
      created_at: "2024-07-20T00:00:00.000Z",
    },
  ],
  "0x1000000000000000000000000000000000000000000000000000000000000003": [
    {
      issuance_nullifier: "0x2000000000000000000000000000000000000000000000000000000000000003",
      amount: 512,
      vintage_year: 2025,
      credit_type: 1,
      tx_hash: "0xbbb0000000000000000000000000000000000000000000000000000000000003",
      block_number: 107,
      created_at: "2024-08-01T00:00:00.000Z",
    },
  ],
};

export const SEEDED_FIXTURE_EVIDENCE: Record<string, EvidenceBundle> = {
  bafkreidemo1tapajos2024evidencebundle000000000000000000000001: {
    bundleVersion: "1.0.0",
    projectId: "0x1000000000000000000000000000000000000000000000000000000000000001",
    aoiGeohash8: "6z900000",
    salt: "0x336a0957067d3dcc1bd8e7f99b8f335927e6568939d0055ea5c7ae8517ad30a0",
    sceneIds: [
      "S2A_MSIL2A_20240715_T21MYT",
      "S2B_MSIL2A_20240824_T21MYT",
    ],
    featureStats: {
      ndvi_mean: { min: 0.568, max: 0.850, mean: 0.768, std: 0.068 },
      ndre_mean: { min: 0.427, max: 0.641, mean: 0.577, std: 0.053 },
      reci_mean: { min: 1.490, max: 3.586, mean: 2.808, std: 0.562 },
      ireci_mean: { min: 3.788, max: 11.479, mean: 8.536, std: 2.104 },
      wc_tree_cover: { min: 0.0, max: 1.0, mean: 0.785, std: 0.411 },
      wc_shrubland: { min: 0.0, max: 1.0, mean: 0.160, std: 0.367 },
      wc_grassland: { min: 0.0, max: 1.0, mean: 0.008, std: 0.088 },
      wc_cropland: { min: 0.0, max: 0.0, mean: 0.0, std: 0.0 },
      wc_wetland: { min: 0.0, max: 1.0, mean: 0.047, std: 0.211 },
    },
    dataCommitment: "0x00000000000000000000000000000000000000000000000000000000000000f6",
    modelHash: "0x00000000000000000000000000000000000000000000000000000000000078ab",
    quantizedFeatures: [768, 577, 2808, 8536, 785, 160, 8, 0, 47],
    predictedCredits: 544,
    vintageYear: 2024,
    creditType: 0,
  },
};
