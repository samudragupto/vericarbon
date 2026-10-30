import { NextResponse } from "next/server";
import {
  createIpfsStore,
  EvidenceBundleSchema,
  PinEvidenceResponseSchema,
  type IIpfsStore,
} from "@vericarbon/sdk";

function resolveIpfsStore(): IIpfsStore {
  return createIpfsStore({
    pinataJwt: process.env.PINATA_JWT,
    gatewayUrl: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL,
  });
}

/**
 * POST /api/evidence
 * Validates an incoming MRV EvidenceBundle JSON against `EvidenceBundleSchema`,
 * pins it to IPFS via `IIpfsStore` (Pinata in prod, deterministic `InMemoryIpfsStore` in test/dev),
 * and returns `{ cid }` validated against `PinEvidenceResponseSchema`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody: unknown = await request.json();
    const parseResult = EvidenceBundleSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid evidence bundle payload",
          issues: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const store = resolveIpfsStore();
    const cid = await store.pinJson(parseResult.data);
    const responsePayload = PinEvidenceResponseSchema.parse({ cid });

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to pin evidence bundle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

