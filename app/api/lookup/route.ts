import { collectRecallRecords } from "@/lib/sources/adapters";
import { decideMatch } from "@/lib/matching/engine";
import { createLookup } from "@/lib/lookup/service";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { applySession, ensureSession } from "@/lib/security/actor";
import { clientIp, lookupRateLimit } from "@/lib/security/rate-limit";
import { productSearchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = lookupRateLimit.check(clientIp(request), Date.now());
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many checks. Wait a moment and try again.", { retryAfterMs: limit.retryAfterMs });
  }
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = productSearchSchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const session = await ensureSession(request);
    const lookup = await createLookup(parsed.data, session.userId);
    return applySession(apiOk({ id: lookup.id, lookup }), session.cookie);
  } catch {
    return apiError(503, "database_unavailable", "The lookup could not be saved. Check the database and try again.");
  }
}

export async function PUT(request: Request) {
  const limit = lookupRateLimit.check(`${clientIp(request)}:search`, Date.now());
  if (!limit.ok) return apiError(429, "rate_limited", "Too many searches. Wait a moment and try again.");
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = productSearchSchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  const collected = await collectRecallRecords(parsed.data);
  const decision = decideMatch(parsed.data, collected.records, collected.sources, new Date());
  return apiOk({
    records: collected.records,
    sources: collected.sources,
    decision,
    demo: collected.records.every((record) => record.isDemoData),
  });
}
