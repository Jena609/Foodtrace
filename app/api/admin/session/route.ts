import { adminCookie, adminSessionValid } from "@/lib/security/actor";
import { safeEqual, sessionSecret, signSession } from "@/lib/security/session";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { adminTokenSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expected = process.env.FOODTRACE_ADMIN_TOKEN?.trim() ?? "";
  if (!expected) return apiError(503, "admin_unconfigured", "Set FOODTRACE_ADMIN_TOKEN before using the admin dashboard.");
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = adminTokenSchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  if (!safeEqual(parsed.data.token, expected)) return apiError(401, "unauthorized", "The admin token was not accepted.");
  const token = signSession("ft_admin_ok", sessionSecret(), Date.now() + 12 * 60 * 60 * 1000);
  const response = apiOk({ ok: true });
  response.headers.append("Set-Cookie", adminCookie(token));
  return response;
}

export async function DELETE() {
  const response = apiOk({ ok: true });
  response.headers.append("Set-Cookie", "ft_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return response;
}

export async function GET(request: Request) {
  return apiOk({ signedIn: adminSessionValid(request) });
}
