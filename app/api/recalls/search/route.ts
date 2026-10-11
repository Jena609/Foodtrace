import { decideMatch } from "@/lib/matching/engine";
import { collectRecallRecords } from "@/lib/sources/adapters";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { clientIp, lookupRateLimit } from "@/lib/security/rate-limit";
import { productSearchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = lookupRateLimit.check(`${clientIp(request)}:recalls`, Date.now());
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
    demo: collected.records.length === 0 || collected.records.every((record) => record.isDemoData),
    saved: false,
  });
}
