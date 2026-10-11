import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { zodErrorMessage } from "@/lib/validation/schemas";

export function apiError(status: number, code: string, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, code, ...(extra ?? {}) }, { status });
}

export function apiOk<T extends Record<string, unknown>>(body: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(body, init);
}

export async function readJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > 100_000) return { ok: false, response: apiError(413, "too_large", "The request is too large.") };
  const text = await request.text();
  if (text.length > 100_000) return { ok: false, response: apiError(413, "too_large", "The request is too large.") };
  if (!text.trim()) return { ok: true, body: {} };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: apiError(400, "invalid_json", "The request body is not valid JSON.") };
  }
}

export function fromZod(error: ZodError) {
  return apiError(400, "invalid_input", zodErrorMessage(error));
}
