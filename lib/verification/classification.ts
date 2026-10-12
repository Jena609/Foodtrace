import type { VerdictStatus } from "@/lib/types";

export const DISPLAY_CLASSIFICATIONS = [
  "NO_MATCH",
  "EXACT_RECALL_MATCH",
  "PARTIAL_MATCH",
  "CONFLICTING_SOURCES",
  "EXPIRED_PRODUCT",
  "SOURCE_UNAVAILABLE",
] as const;

export type DisplayClassification = (typeof DISPLAY_CLASSIFICATIONS)[number];
export type ReviewStatus = "PENDING" | "FINALIZED" | "FAILED" | "UNAVAILABLE";
export type DataStatus = "Live Data" | "Demo Data" | "Fictional Demo Data";

export function displayClassification(
  status: VerdictStatus,
  criteria: string[],
  evidence: Array<{ matched: boolean; recordKind: string }> = [],
): DisplayClassification {
  const matched = evidence.filter((item) => item.matched);
  const kinds = new Set(matched.map((item) => item.recordKind));
  if (status === "CONFLICTING_INFORMATION" || (kinds.has("recall") && kinds.has("clearance"))) return "CONFLICTING_SOURCES";
  if (status === "EXPIRED") return "EXPIRED_PRODUCT";
  if (status === "UNABLE_TO_VERIFY") return "SOURCE_UNAVAILABLE";
  if (status === "NO_MATCHING_RECALL_FOUND") return "NO_MATCH";
  const exact = criteria.includes("exact_barcode_and_lot") || criteria.includes("exact_lot_number");
  return exact ? "EXACT_RECALL_MATCH" : "PARTIAL_MATCH";
}

export function reviewStatus(finalizationStatus: string, isMock: boolean): ReviewStatus {
  if (finalizationStatus === "finalized" && !isMock) return "FINALIZED";
  if (finalizationStatus === "failed" || finalizationStatus === "inconclusive" || finalizationStatus === "disputed") return "FAILED";
  if (isMock || finalizationStatus === "mock" || finalizationStatus === "unavailable") return "UNAVAILABLE";
  return "PENDING";
}

export function dataStatus(records: Array<{ demo: boolean }>, sources: Array<{ demo?: boolean; skipped?: boolean }> = []): DataStatus {
  if (records.length > 0 && records.every((record) => record.demo)) return "Fictional Demo Data";
  if (records.some((record) => record.demo)) return "Demo Data";
  const liveRan = sources.some((source) => source.demo === false && !source.skipped);
  if (!liveRan) return "Fictional Demo Data";
  return "Live Data";
}

export function sourceAgreement(status: VerdictStatus, evidence: Array<{ matched: boolean; recordKind: string }>): string {
  if (status === "CONFLICTING_INFORMATION") return "Sources conflict";
  const matched = evidence.filter((item) => item.matched);
  const kinds = new Set(matched.map((item) => item.recordKind));
  if (kinds.has("recall") && kinds.has("clearance")) return "Sources conflict";
  if (matched.length > 1) return "Matching sources agree";
  if (matched.length === 1) return "One source matched";
  return "No source matched this product";
}
