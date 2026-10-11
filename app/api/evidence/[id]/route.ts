import { prisma } from "@/lib/db/client";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const evidence = await prisma.evidenceRecord.findUnique({ where: { id } });
  if (!evidence) return apiError(404, "not_found", "That evidence record was not found.");
  return apiOk({
    evidence: {
      id: evidence.id,
      lookupId: evidence.lookupId,
      sourceName: evidence.sourceName,
      sourceUrl: evidence.sourceUrl,
      evidenceText: evidence.evidenceText,
      evidenceHash: evidence.evidenceHash,
      sourcePriority: evidence.sourcePriority,
      retrievedAt: evidence.retrievedAt.toISOString(),
      matched: evidence.matched,
      recordKind: evidence.recordKind,
    },
  });
}
