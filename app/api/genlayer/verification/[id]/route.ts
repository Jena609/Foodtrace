import { continueServerVerification } from "@/lib/genlayer/server-write";
import { refreshVerification } from "@/lib/genlayer/studio";
import { getLookup } from "@/lib/lookup/service";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await continueServerVerification(id);
  const refreshed = await refreshVerification(id);
  if (!refreshed.ok) return apiError(refreshed.status, "not_found", refreshed.error);
  const lookup = await getLookup(id);
  return apiOk({ refresh: refreshed, lookup });
}
