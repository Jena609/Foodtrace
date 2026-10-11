import { getLookup } from "@/lib/lookup/service";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const lookup = await getLookup(id);
    if (!lookup) return apiError(404, "not_found", "That lookup was not found.");
    return apiOk({ lookup });
  } catch {
    return apiError(503, "database_unavailable", "The lookup could not be read.");
  }
}
