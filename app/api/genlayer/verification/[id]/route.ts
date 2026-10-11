import { refreshVerification } from "@/lib/genlayer/studio";
import { getLookup } from "@/lib/lookup/service";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const refreshed = await refreshVerification(id);
  if (!refreshed.ok) return apiError(refreshed.status, "not_found", refreshed.error);
  const lookup = await getLookup(id);
  return apiOk({ refresh: refreshed, lookup });
}
