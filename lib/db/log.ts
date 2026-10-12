export function logServerError(scope: string, error: unknown): void {
  const raw = error instanceof Error ? error.message : "unknown error";
  const safe = raw
    .replace(/libsql:\/\/\S+/gi, "[database]")
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/eyJ[\w.-]+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  console.error(`[foodtrace] ${scope}: ${safe}`);
}
