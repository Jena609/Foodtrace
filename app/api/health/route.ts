import { prisma } from "@/lib/db/client";
import { apiError, apiOk } from "@/lib/http";
import { publicConfig } from "@/lib/genlayer/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.user.count();
    return apiOk({ ok: true, database: "ok", config: publicConfig() });
  } catch {
    return apiError(503, "database_unavailable", "The database is not reachable.");
  }
}
