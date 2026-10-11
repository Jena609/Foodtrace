import { listHistory } from "@/lib/lookup/service";
import { apiError, apiOk } from "@/lib/http";
import { sessionUserId } from "@/lib/security/actor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await sessionUserId(request);
    if (!userId) return apiOk({ signedIn: false, items: [] });
    const items = await listHistory(userId);
    return apiOk({ signedIn: true, items });
  } catch {
    return apiError(503, "database_unavailable", "History could not be read. Check the database and try again.");
  }
}
