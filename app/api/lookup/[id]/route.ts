import { logServerError } from "@/lib/db/log";
import { continueServerVerification } from "@/lib/genlayer/server-write";
import { refreshVerification } from "@/lib/genlayer/studio";
import { getLookup } from "@/lib/lookup/service";
import { apiError, apiOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await continueServerVerification(id).catch((error: unknown) => {
      logServerError("lookup.continue", error);
    });
    await refreshVerification(id).catch((error: unknown) => {
      logServerError("lookup.refresh", error);
    });
    const lookup = await getLookup(id);
    if (!lookup) return apiError(404, "not_found", "That lookup was not found.");
    return apiOk({ lookup });
  } catch (error) {
    logServerError("lookup.read", error);
    return apiError(503, "database_unavailable", "The lookup could not be read.");
  }
}
