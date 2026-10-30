import assert from "node:assert/strict";
import fs from "node:fs";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import {
  CARBON_REGISTRY_EVENTS_ABI,
  createBaseSepoliaPublicClient,
  decodeCarbonRegistryLog,
  decodeClaimedLog,
  decodeIssuedLog,
  decodeProjectRegisteredLog,
  EvidenceBundleSchema,
  InMemoryIpfsStore,
} from "./dist/index.js";

// 1. Validate fixture EvidenceBundle against EvidenceBundleSchema
const rawBundle = JSON.parse(
  fs.readFileSync("../../services/mrv/tests/fixtures/evidence_bundle.json", "utf8"),
);
const parsedBundle = EvidenceBundleSchema.parse(rawBundle);
assert.equal(parsedBundle.dataCommitment.startsWith("0x"), true);

// 2. Test InMemoryIpfsStore deterministic CID pinning and retrieval
const ipfs = new InMemoryIpfsStore();
const cid1 = await ipfs.pinJson(parsedBundle);
const cid2 = await ipfs.pinJson(parsedBundle);
assert.equal(cid1, cid2, "Deterministic CID must be identical for identical bundle");
assert.equal(cid1.startsWith("bafkrei"), true);

const fetchedBundle = await ipfs.getJson(cid1);
assert.deepEqual(fetchedBundle, parsedBundle);
assert.equal(await ipfs.getJson("bafkreinonexistent"), null);

// 3. Test viem publicClient creation
const publicClient = createBaseSepoliaPublicClient();
assert.equal(publicClient.chain?.id, 84532);

// 4. Test typed event decoders for ProjectRegistered, Issued, Claimed
const projectId =
  "0x1111111111111111111111111111111111111111111111111111111111111111";
const geoCommitment =
  "0x2222222222222222222222222222222222222222222222222222222222222222";
const registrar = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const txHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const projTopics = encodeEventTopics({
  abi: CARBON_REGISTRY_EVENTS_ABI,
  eventName: "ProjectRegistered",
  args: { projectId, geoCommitment, registrar },
});
const projData = encodeAbiParameters([{ type: "string" }], [cid1]);
const decodedProj = decodeProjectRegisteredLog({
  topics: projTopics,
  data: projData,
  transactionHash: txHash,
  logIndex: 0,
  blockNumber: 42n,
});
assert.equal(decodedProj.eventName, "ProjectRegistered");
assert.equal(decodedProj.projectId, projectId);
assert.equal(decodedProj.evidenceCid, cid1);

const issuanceNullifier =
  "0x3333333333333333333333333333333333333333333333333333333333333333";
const issuedTopics = encodeEventTopics({
  abi: CARBON_REGISTRY_EVENTS_ABI,
  eventName: "Issued",
  args: { issuanceNullifier, projectId },
});
const issuedData = encodeAbiParameters(
  [
    { type: "uint256" },
    { type: "uint16" },
    { type: "uint8" },
    { type: "string" },
  ],
  [544n, 2024, 0, cid1],
);
const decodedIssued = decodeIssuedLog({
  topics: issuedTopics,
  data: issuedData,
  transactionHash: txHash,
  logIndex: 1,
  blockNumber: 43n,
});
assert.equal(decodedIssued.eventName, "Issued");
assert.equal(decodedIssued.amount, 544n);
assert.equal(decodedIssued.vintageYear, 2024);

const claimNullifier =
  "0x4444444444444444444444444444444444444444444444444444444444444444";
const claimedTopics = encodeEventTopics({
  abi: CARBON_REGISTRY_EVENTS_ABI,
  eventName: "Claimed",
  args: { claimNullifier },
});
const claimedData = encodeAbiParameters(
  [{ type: "uint256[]" }, { type: "uint8" }],
  [[1n, 2n], 0],
);
const decodedClaimed = decodeClaimedLog({
  topics: claimedTopics,
  data: claimedData,
  transactionHash: txHash,
  logIndex: 2,
  blockNumber: 44n,
});
assert.equal(decodedClaimed.eventName, "Claimed");
assert.deepEqual(decodedClaimed.serialIds, [1n, 2n]);

assert.equal(
  decodeCarbonRegistryLog({
    topics: issuedTopics,
    data: issuedData,
    transactionHash: txHash,
    logIndex: 1,
    blockNumber: 43n,
  })?.eventName,
  "Issued",
);

console.log(
  "@vericarbon/sdk validated EvidenceBundleSchema, IIpfsStore, and event decoders successfully",
);

