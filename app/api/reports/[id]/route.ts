import { getLookup } from "@/lib/lookup/service";
import { toPublicReport } from "@/lib/lookup/view";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lookup = await getLookup(id);
  if (!lookup) return apiError(404, "not_found", "That report was not found.");
  return apiOk({ report: toPublicReport(lookup) });
}
