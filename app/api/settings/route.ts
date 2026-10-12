import { prisma } from "@/lib/db/client";
import { logServerError } from "@/lib/db/log";
import { publicConfig } from "@/lib/genlayer/config";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { applySession, ensureSession, sessionUserId } from "@/lib/security/actor";
import { emailSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = publicConfig();
  try {
    const userId = await sessionUserId(request);
    if (!userId) return apiOk({ user: null, config });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return apiOk({
      user: user ? { id: user.id, email: user.email ?? "", walletAddress: user.walletAddress ?? "", role: user.role, defaultRegion: user.defaultRegion, emailAlerts: user.emailAlerts } : null,
      config,
    });
  } catch (error) {
    logServerError("settings.read", error);
    return apiError(503, "database_unavailable", "Settings could not be loaded. Check the database and try again.");
  }
}

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = emailSchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  try {
    const session = await ensureSession(request);
    if (parsed.data.email) {
      const taken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (taken && taken.id !== session.userId) return apiError(409, "email_in_use", "That email is already used on another FoodTrace profile.");
    }
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        email: parsed.data.email || null,
        defaultRegion: parsed.data.defaultRegion,
        emailAlerts: parsed.data.emailAlerts,
      },
    });
    return applySession(apiOk({ user: { id: user.id, email: user.email ?? "", defaultRegion: user.defaultRegion, emailAlerts: user.emailAlerts } }), session.cookie);
  } catch (error) {
    logServerError("settings.write", error);
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("unique") || message.toLowerCase().includes("email")) {
      return apiError(409, "email_in_use", "That email is already used on another FoodTrace profile.");
    }
    return apiError(503, "database_unavailable", "Settings could not be saved. Check the database and try again.");
  }
}
