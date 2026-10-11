import { SourceError } from "@/lib/sources/types";
import { assertPublicHttpsUrl } from "@/lib/security/url";

export async function fetchPublicJson(url: string, timeoutMs: number): Promise<{ status: number; body: unknown }> {
  const parsed = assertPublicHttpsUrl(url);
  if (!parsed) throw new SourceError("invalid_url", "The source URL is not an allowed public https URL.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(parsed, {
      signal: controller.signal,
      redirect: "error",
      headers: { accept: "application/json" },
    });
    const text = await response.text();
    if (text.length > 1_000_000) throw new SourceError("malformed", "The source response was too large.");
    let body: unknown = null;
    if (text.trim()) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new SourceError("malformed", "The source response was not valid JSON.");
      }
    }
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof SourceError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new SourceError("timeout", "The source timed out.");
    throw new SourceError("http", "The source request failed.");
  } finally {
    clearTimeout(timer);
  }
}
