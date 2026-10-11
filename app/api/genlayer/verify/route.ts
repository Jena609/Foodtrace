import { z } from "zod";
import { attachTransaction, prepareVerification } from "@/lib/genlayer/studio";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { requireSignature } from "@/lib/security/actor";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("phase", [
  z.object({ phase: z.literal("prepare"), lookupId: z.string().min(8).max(80) }),
  z.object({
    phase: z.literal("submitted"),
    lookupId: z.string().min(8).max(80),
    evaluationId: z.string().min(8).max(80),
    transactionId: z.string().min(10).max(80),
  }),
]);

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = schema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  const action = parsed.data.phase === "prepare" ? "genlayer.prepare" : "genlayer.submit";
  const signature = await requireSignature(request, action, json.body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  if (parsed.data.phase === "prepare") {
    const prepared = await prepareVerification(parsed.data.lookupId);
    if (!prepared.ok) return apiError(prepared.status, "genlayer_unavailable", prepared.error);
    return apiOk(prepared);
  }
  const attached = await attachTransaction(parsed.data.lookupId, parsed.data.evaluationId, parsed.data.transactionId);
  if (!attached.ok) return apiError(attached.status, "invalid_transaction", attached.error);
  return apiOk({ ok: true, finalizationStatus: "pending" });
}
