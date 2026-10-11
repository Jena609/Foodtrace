import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ft_session";
export const ADMIN_COOKIE = "ft_admin";
const DAY_MS = 24 * 60 * 60 * 1000;

export function sessionSecret(): string {
  return process.env.FOODTRACE_SESSION_SECRET?.trim() || "dev-only-change-me";
}

export function sessionSecretIsDefault(): boolean {
  return sessionSecret() === "dev-only-change-me";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSession(userId: string, secret: string, expiresAt: number): string {
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readSession(token: string, secret: string, now: number): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, signature] = parts;
  if (!userId || !expRaw || !signature) return null;
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(userId)) return null;
  const expiresAt = Number(expRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return null;
  const payload = `${userId}.${expRaw}`;
  const expected = sign(payload, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;
  return userId;
}

export function newUserId(): string {
  return `usr_${randomUUID().replace(/-/g, "")}`;
}

export function sessionExpiry(now = Date.now()): number {
  return now + 180 * DAY_MS;
}

export function sessionCookie(name: string, value: string, maxAgeSeconds: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function safeEqual(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}
