import { submitServerVerification } from "@/lib/genlayer/server-write";
import { refreshVerification } from "@/lib/genlayer/studio";
import { getLookup } from "@/lib/lookup/service";
import { logServerError } from "@/lib/db/log";
import { apiError, apiOk } from "@/lib/http";
import { clientIp, lookupRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limit = lookupRateLimit.check(`${clientIp(request)}:genlayer`, Date.now());
  if (!limit.ok) return apiError(429, "rate_limited", "Too many verification attempts. Wait a moment and try again.");
  const { id } = await context.params;
  try {
    await refreshVerification(id);
    const current = await getLookup(id);
    if (current?.genlayerTransactionId && current.reviewStatus !== "FAILED" && current.reviewStatus !== "UNAVAILABLE") {
      return apiOk({ lookup: current, transactionId: current.genlayerTransactionId, evaluationId: current.genlayerEvaluationId });
    }
    const submitted = await submitServerVerification(id);
    const lookup = await getLookup(id);
    if (!lookup) return apiError(404, "not_found", "That lookup was not found.");
    if (!submitted.ok) return apiError(503, "genlayer_unavailable", submitted.error);
    return apiOk({ lookup, transactionId: submitted.hash, evaluationId: submitted.evaluationId });
  } catch (error) {
    logServerError("genlayer.retry", error);
    return apiError(503, "genlayer_unavailable", "GenLayer verification is currently unavailable. No finalized result was created.");
  }
}
