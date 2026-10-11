import type { RecallRecordInput } from "@/lib/types";
import { sanitizeEvidence } from "@/lib/security/sanitize";
import { SourceError } from "@/lib/sources/types";

export function escapeOpenFdaTerm(value: string): string {
  return value.replace(/[^a-zA-Z0-9 .,&'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function buildOpenFdaUrl(input: { barcode: string; productName: string; brand: string; lotNumber: string }): string | null {
  const clauses: string[] = [];
  const lot = escapeOpenFdaTerm(input.lotNumber);
  const name = escapeOpenFdaTerm(input.productName);
  const brand = escapeOpenFdaTerm(input.brand);
  const barcode = escapeOpenFdaTerm(input.barcode);
  if (lot.length >= 4) clauses.push(`code_info:"${lot}"`);
  if (name.length >= 3) clauses.push(`product_description:"${name}"`);
  else if (brand.length >= 3) clauses.push(`recalling_firm:"${brand}"`);
  if (!clauses.length && barcode.length >= 8) clauses.push(`product_description:"${barcode}"`);
  if (!clauses.length) return null;
  const url = new URL("https://api.fda.gov/food/enforcement.json");
  url.searchParams.set("search", clauses.join(" OR "));
  url.searchParams.set("limit", "5");
  return url.toString();
}

export function interpretOpenFdaHttp(status: number, body: unknown): "empty" | "ok" | "error" {
  if (status === 404) {
    const code = body && typeof body === "object" && "error" in body ? (body as { error?: { code?: string } }).error?.code : undefined;
    return code === "NOT_FOUND" ? "empty" : "error";
  }
  if (status >= 200 && status < 300) return "ok";
  return "error";
}

function fdaDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return "";
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function lotCandidates(codeInfo: string): string[] {
  const parts = codeInfo.split(/[,;\n]/).map((part) => part.trim()).filter((part) => part.length >= 4 && part.length <= 64);
  return [...new Set(parts)].slice(0, 12);
}

export function parseOpenFdaPayload(body: unknown, retrievedAt: string, sourceUrl: string): RecallRecordInput[] {
  if (!body || typeof body !== "object") throw new SourceError("malformed", "The openFDA response was not an object.");
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) throw new SourceError("malformed", "The openFDA response did not include a results array.");
  return results.slice(0, 8).map((item, index) => {
    if (!item || typeof item !== "object") throw new SourceError("malformed", "An openFDA result was malformed.");
    const row = item as Record<string, unknown>;
    const description = sanitizeEvidence(String(row.product_description ?? ""));
    const firm = sanitizeEvidence(String(row.recalling_firm ?? ""));
    const reason = sanitizeEvidence(String(row.reason_for_recall ?? ""));
    const code = sanitizeEvidence(String(row.code_info ?? ""));
    const recallNumber = sanitizeEvidence(String(row.recall_number ?? `row-${index + 1}`));
    return {
      id: `openfda-${recallNumber || index + 1}`,
      sourceName: "U.S. FDA Enforcement Report (openFDA)",
      sourceUrl,
      sourcePriority: 1,
      productName: description.slice(0, 180) || "FDA enforcement report",
      brand: firm.slice(0, 120),
      barcode: "",
      lotNumbers: lotCandidates(code),
      recallReason: reason || "The FDA enforcement report did not include a reason field.",
      recallDate: fdaDate(String(row.recall_initiation_date ?? row.report_date ?? "")),
      geographicScope: sanitizeEvidence(String(row.distribution_pattern ?? "")),
      rawEvidence: sanitizeEvidence([description, code, reason].filter(Boolean).join("\n")),
      retrievedAt,
      isDemoData: false,
      recordKind: "recall",
      region: sanitizeEvidence(String(row.country ?? "")),
    };
  });
}
