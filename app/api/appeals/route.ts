import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { UNAVAILABLE_MESSAGE, resolveGenLayerConfig } from "@/lib/genlayer/config";
import { isTransactionHash } from "@/lib/genlayer/observation";
import { publicEvidenceUrls, studioPayload } from "@/lib/genlayer/studio";
import { getLookup } from "@/lib/lookup/service";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { requireSignature } from "@/lib/security/actor";
import { isFetchablePublicUrl } from "@/lib/security/url";
import { appealSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const submittedSchema = z.object({
  phase: z.literal("submitted"),
  appealId: z.string().min(8).max(80),
  transactionId: z.string().min(10).max(80),
});

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const body = json.body;
  if (body && typeof body === "object" && (body as { phase?: string }).phase === "submitted") {
    const parsed = submittedSchema.safeParse(body);
    if (!parsed.success) return fromZod(parsed.error);
    const signature = await requireSignature(request, "appeal.submit", body);
    if (!signature.ok) return apiError(401, "unauthorized", signature.error);
    if (!isTransactionHash(parsed.data.transactionId)) return apiError(400, "invalid_transaction", "The transaction id is not a valid hash.");
    const appeal = await prisma.appeal.findUnique({ where: { id: parsed.data.appealId } });
    if (!appeal || appeal.genlayerTransactionId) return apiError(409, "invalid_appeal", "That appeal cannot accept this transaction.");
    const updated = await prisma.appeal.update({
      where: { id: appeal.id },
      data: { genlayerTransactionId: parsed.data.transactionId, status: "pending" },
    });
    return apiOk({ appeal: updated, originalPreserved: true });
  }

  const parsed = appealSchema.safeParse(body);
  if (!parsed.success) return fromZod(parsed.error);
  const signature = await requireSignature(request, "appeal.create", body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  const lookup = await getLookup(parsed.data.lookupId);
  if (!lookup) return apiError(404, "not_found", "That result was not found.");
  const gen = resolveGenLayerConfig(process.env);
  const appealId = `apl_${randomUUID().replace(/-/g, "")}`;

  if (gen.mode === "mock") {
    const appeal = await prisma.appeal.create({
      data: {
        id: appealId,
        verificationResultId: lookup.resultId,
        reason: parsed.data.reason,
        newEvidence: parsed.data.newEvidenceUrl,
        explanation: parsed.data.explanation,
        status: "recorded",
        outcomeStatus: "UNABLE_TO_VERIFY",
        outcomeSummary: "The appeal was recorded and the original result was preserved. FoodTrace did not retrieve the new URL and did not create a GenLayer transaction. MOCK RESULT.",
        isMock: true,
        resolvedAt: new Date(),
      },
    });
    const fresh = await getLookup(lookup.id);
    return apiOk({ appeal, lookup: fresh, originalStatus: lookup.status, mock: true });
  }

  if (!gen.studioReady) return apiError(503, "genlayer_unavailable", UNAVAILABLE_MESSAGE);
  if (lookup.finalizationStatus !== "finalized" || lookup.isMock || !lookup.genlayerEvaluationId) {
    return apiError(422, "not_finalized", "This result was not finalized on GenLayer, so an on-chain appeal cannot reference it. No appeal transaction was created.");
  }
  if (!parsed.data.newEvidenceUrl || !isFetchablePublicUrl(parsed.data.newEvidenceUrl)) {
    return apiError(422, "evidence_url", "An on-chain appeal needs a publicly reachable https evidence URL. No transaction was created.");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const urls = publicEvidenceUrls([parsed.data.newEvidenceUrl, ...lookup.evidence.map((item) => item.sourceUrl)], appUrl);
  if (!urls.includes(parsed.data.newEvidenceUrl)) {
    return apiError(422, "evidence_url", "That evidence URL cannot be fetched by GenLayer Studio. No transaction was created.");
  }
  const payloadJson = studioPayload({
    productName: lookup.input.productName,
    brand: lookup.input.brand,
    barcode: lookup.input.barcode,
    lotNumber: lookup.input.lotNumber,
    expirationDate: lookup.input.expirationDate,
    region: lookup.input.region,
    evidenceUrls: urls,
    evidenceHash: lookup.evidenceHash,
    requestTimestamp: new Date().toISOString(),
  });
  const appeal = await prisma.appeal.create({
    data: {
      id: appealId,
      verificationResultId: lookup.resultId,
      reason: parsed.data.reason,
      newEvidence: parsed.data.newEvidenceUrl,
      explanation: parsed.data.explanation,
      status: "prepared",
      isMock: false,
    },
  });
  return apiOk({
    appeal,
    originalStatus: lookup.status,
    contractAddress: gen.contractAddress,
    method: "submit_appeal",
    args: [appealId, lookup.genlayerEvaluationId, payloadJson],
    chainId: gen.chainId,
  });
}
