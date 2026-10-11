import type { RecallRecordInput } from "@/lib/types";
import { sanitizeEvidence } from "@/lib/security/sanitize";

export interface EvidenceDocument {
  sourceName: string;
  sourceUrl: string;
  sourcePriority: number;
  recordKind: string;
  productName: string;
  brand: string;
  barcode: string;
  lotNumbers: string[];
  recallReason: string;
  retrievedAt: string;
  geographicScope: string;
  isDemoData: boolean;
  evidenceText: string;
}

export function formatEvidenceText(record: EvidenceDocument): string {
  return [
    "FoodTrace-Evidence: 1",
    `Source: ${sanitizeEvidence(record.sourceName)}`,
    `Source-URL: ${record.sourceUrl}`,
    `Priority: ${record.sourcePriority}`,
    `Kind: ${record.recordKind}`,
    `Product: ${sanitizeEvidence(record.productName)}`,
    `Brand: ${sanitizeEvidence(record.brand)}`,
    `Barcode: ${record.barcode}`,
    `Lots: ${record.lotNumbers.join(", ")}`,
    `Reason: ${sanitizeEvidence(record.recallReason)}`,
    `Retrieved: ${record.retrievedAt}`,
    `Scope: ${sanitizeEvidence(record.geographicScope)}`,
    `Demo: ${record.isDemoData ? "yes" : "no"}`,
    "Body:",
    sanitizeEvidence(record.evidenceText),
  ].join("\n");
}

function lineValue(text: string, label: string): string {
  const prefix = `${label.toLowerCase()}:`;
  for (const line of text.split("\n")) {
    const cleaned = line.trim();
    if (cleaned.toLowerCase().startsWith(prefix)) return cleaned.slice(prefix.length).trim();
  }
  return "";
}

export function parseEvidenceDocument(text: string, pageUrl: string): RecallRecordInput | null {
  if (!text.toLowerCase().includes("foodtrace-evidence:")) return null;
  const lots = lineValue(text, "Lots").split(",").map((lot) => lot.trim()).filter(Boolean);
  const priority = Number(lineValue(text, "Priority"));
  const kind = lineValue(text, "Kind").toLowerCase() === "clearance" ? "clearance" : "recall";
  return {
    id: pageUrl,
    sourceName: lineValue(text, "Source") || "Fetched evidence",
    sourceUrl: lineValue(text, "Source-URL") || pageUrl,
    sourcePriority: Number.isFinite(priority) ? priority : 6,
    productName: lineValue(text, "Product"),
    brand: lineValue(text, "Brand"),
    barcode: lineValue(text, "Barcode"),
    lotNumbers: lots,
    recallReason: lineValue(text, "Reason"),
    recallDate: "",
    geographicScope: lineValue(text, "Scope"),
    rawEvidence: sanitizeEvidence(text),
    retrievedAt: lineValue(text, "Retrieved") || new Date(0).toISOString(),
    isDemoData: lineValue(text, "Demo").toLowerCase() === "yes",
    recordKind: kind,
    region: "",
  };
}

export function capSourcePriority(url: string, claimed: number): number {
  void claimed;
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return 6;
  }
  if (host === "fda.gov" || host.endsWith(".fda.gov") || host.endsWith(".usda.gov")) return 1;
  if (host === "cdc.gov" || host.endsWith(".cdc.gov")) return 3;
  return 6;
}
