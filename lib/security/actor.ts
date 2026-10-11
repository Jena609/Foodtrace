import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { verifyFoodTraceSignature } from "@/lib/security/signature";
import { ADMIN_COOKIE, SESSION_COOKIE, newUserId, readSession, sessionCookie, sessionExpiry, sessionSecret, signSession } from "@/lib/security/session";

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function ensureSession(request: Request): Promise<{ userId: string; cookie: string | null }> {
  const secret = sessionSecret();
  const existing = readSession(readCookie(request.headers.get("cookie"), SESSION_COOKIE) ?? "", secret, Date.now());
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing } });
    if (user) return { userId: user.id, cookie: null };
  }
  const userId = newUserId();
  await prisma.user.create({ data: { id: userId, role: "consumer" } });
  return { userId, cookie: signSession(userId, secret, sessionExpiry()) };
}

export function applySession(response: Response, cookie: string | null) {
  if (!cookie) return response;
  response.headers.append("Set-Cookie", sessionCookie(SESSION_COOKIE, cookie, 180 * 24 * 60 * 60));
  return response;
}

export async function sessionUserId(request: Request): Promise<string | null> {
  const secret = sessionSecret();
  const existing = readSession(readCookie(request.headers.get("cookie"), SESSION_COOKIE) ?? "", secret, Date.now());
  if (!existing) return null;
  const user = await prisma.user.findUnique({ where: { id: existing } });
  return user?.id ?? null;
}

export async function requireSignature(request: Request, action: string, body: unknown) {
  const verified = await verifyFoodTraceSignature({
    action: request.headers.get("x-foodtrace-action") ?? "",
    wallet: request.headers.get("x-foodtrace-wallet") ?? "",
    nonce: request.headers.get("x-foodtrace-nonce") ?? "",
    timestamp: request.headers.get("x-foodtrace-timestamp") ?? "",
    signature: request.headers.get("x-foodtrace-signature") ?? "",
    body,
  });
  if (!verified.ok) return verified;
  if (request.headers.get("x-foodtrace-action") !== action) {
    return { ok: false as const, error: "The signed action does not match this request." };
  }
  try {
    await prisma.replayNonce.create({
      data: { id: `nonce_${randomUUID().replace(/-/g, "")}`, wallet: verified.wallet, nonce: request.headers.get("x-foodtrace-nonce") ?? "" },
    });
  } catch {
    return { ok: false as const, error: "This signed request was already used." };
  }
  return verified;
}

export function adminSessionValid(request: Request): boolean {
  const token = readCookie(request.headers.get("cookie"), ADMIN_COOKIE);
  if (!token) return false;
  return readSession(token, sessionSecret(), Date.now()) === "ft_admin_ok";
}

export function adminCookie(token: string): string {
  return sessionCookie(ADMIN_COOKIE, token, 12 * 60 * 60);
}
