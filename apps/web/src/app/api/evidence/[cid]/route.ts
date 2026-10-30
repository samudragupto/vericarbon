import { NextResponse } from "next/server";
import {
  createIpfsStore,
  EvidenceBundleSchema,
  type IIpfsStore,
} from "@vericarbon/sdk";

function resolveIpfsStore(): IIpfsStore {
  return createIpfsStore({
    pinataJwt: process.env.PINATA_JWT,
    gatewayUrl: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  });
}

/**
 * GET /api/evidence/[cid]
 * Fetches an MRV EvidenceBundle by CID from `IIpfsStore`, validates it against
 * `EvidenceBundleSchema`, and returns the verified JSON payload.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ cid: string }> },
): Promise<NextResponse> {
  try {
    const { cid } = await context.params;
    if (!cid || cid.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing CID parameter" },
        { status: 400 },
      );
    }

    const store = resolveIpfsStore();
    const bundle = await store.getJson(cid);
    if (!bundle) {
      return NextResponse.json(
        { error: `Evidence bundle not found for CID: ${cid}` },
        { status: 404 },
      );
    }

    const validated = EvidenceBundleSchema.parse(bundle);
    return NextResponse.json(validated, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to retrieve evidence bundle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

