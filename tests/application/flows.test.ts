import { describe, expect, it } from "vitest";
import { appendAppeal, reviewAppeal } from "@/lib/appeals/service";
import { alertsFor, deriveInventoryStatus } from "@/lib/inventory/status";
import { reportHasPrivateFields, toPublicReport, type PublicReport } from "@/lib/reports/public-report";
import { decideMatch } from "@/lib/matching/engine";
import type { MatchDecision } from "@/lib/types";

const NOW = new Date("2026-10-11T12:00:00.000Z");

function decision(status: MatchDecision["status"]): MatchDecision {
  return decideMatch(
    { barcode: "", productName: "Harbor Mill Whole Milk", brand: "Harbor Mill", lotNumber: "DEMO-MILK-2002", expirationDate: "", region: "" },
    [],
    [{ name: "Demo", region: "Demo", ok: true, demo: true }],
    NOW,
  ).status === status
    ? decideMatch(
        { barcode: "", productName: "Harbor Mill Whole Milk", brand: "Harbor Mill", lotNumber: "DEMO-MILK-2002", expirationDate: "", region: "" },
        [],
        [{ name: "Demo", region: "Demo", ok: true, demo: true }],
        NOW,
      )
    : decideMatch(
        { barcode: "", productName: "Harbor Mill Whole Milk", brand: "Harbor Mill", lotNumber: "DEMO-MILK-2002", expirationDate: "", region: "" },
        [],
        [{ name: "Demo", region: "Demo", ok: true, demo: true }],
        NOW,
      );
}

describe("appeals, inventory, and reports", () => {
  it("keeps the original result when an appeal adds a new outcome", () => {
    const original = decision("NO_MATCHING_RECALL_FOUND");
    const snapshot = structuredClone(original);
    const reviewed = reviewAppeal({
      original,
      search: { barcode: "0123456789012", productName: "Green Valley Organic Baby Spinach", brand: "Green Valley", lotNumber: "LOT-100", expirationDate: "", region: "" },
      records: [{
        id: "new",
        sourceName: "Demo Government Food-Safety Authority",
        sourceUrl: "https://demo.foodtrace.invalid/new",
        sourcePriority: 1,
        productName: "Green Valley Organic Baby Spinach",
        brand: "Green Valley",
        barcode: "0123456789012",
        lotNumbers: ["LOT-100"],
        recallReason: "Fictional new evidence",
        recallDate: "2026-10-01",
        geographicScope: "Test",
        rawEvidence: "New fictional evidence",
        retrievedAt: NOW.toISOString(),
        isDemoData: true,
        recordKind: "recall",
        region: "",
      }],
      sources: [{ name: "Demo", region: "Demo", ok: true, demo: true }],
      now: NOW,
    });
    expect(reviewed.original).toEqual(snapshot);
    expect(reviewed.outcome.status).toBe("RECALL_FOUND");
    const stored = { status: original.status, reasoningSummary: original.reasoningSummary };
    const next = appendAppeal(stored, [], {
      id: "apl_1",
      verificationResultId: "vr_1",
      reason: "new_evidence",
      newEvidence: "https://example.com/notice",
      explanation: "A later notice was published.",
      status: "resolved",
      outcomeStatus: reviewed.outcome.status,
      outcomeSummary: reviewed.outcome.reasoningSummary,
      createdAt: NOW.toISOString(),
    });
    expect(next.result).toBe(stored);
    expect(next.appeals).toHaveLength(1);
  });

  it("derives inventory status and alerts", () => {
    expect(deriveInventoryStatus({ expirationDate: "2026-12-01", verificationStatus: "RECALL_FOUND" }, NOW)).toBe("recall_found");
    expect(deriveInventoryStatus({ expirationDate: "2024-01-01", verificationStatus: null }, NOW)).toBe("expired");
    expect(deriveInventoryStatus({ expirationDate: "2026-10-20", verificationStatus: "NO_MATCHING_RECALL_FOUND" }, NOW)).toBe("expiring_soon");
    expect(deriveInventoryStatus({ expirationDate: "2027-01-01", verificationStatus: null }, NOW)).toBe("unverified");
    const alerts = alertsFor([
      { id: "1", productName: "Spinach", status: "recall_found", expirationDate: "2026-12-01" },
      { id: "2", productName: "Milk", status: "no_matching_recall", expirationDate: "2027-01-01" },
    ]);
    expect(alerts.map((alert) => alert.kind)).toEqual(["recall"]);
  });

  it("builds a public report without private business fields", () => {
    const report: PublicReport = {
      reportId: "lk_123",
      createdAt: NOW.toISOString(),
      product: { productName: "Harbor Mill Whole Milk", brand: "Harbor Mill", barcode: "", lotNumber: "DEMO-MILK-2002", expirationDate: "", region: "United States" },
      searchParameters: { barcode: "", productName: "Harbor Mill Whole Milk", brand: "Harbor Mill", lotNumber: "DEMO-MILK-2002", expirationDate: "", region: "United States" },
      status: "NO_MATCHING_RECALL_FOUND",
      confidence: "low",
      reasoningSummary: "No matching recall was found in the configured sources as of 2026-10-11T12:00:00.000Z.",
      matchedCriteria: [],
      finalizationStatus: "mock",
      isMock: true,
      genlayerTransactionId: "",
      genlayerEvaluationId: "",
      evidenceHash: "0xabc",
      evaluatedAt: NOW.toISOString(),
      sources: [],
      appeals: [],
      disclaimer: "FoodTrace does not guarantee that a product is safe to eat.",
    };
    const pub = toPublicReport(report);
    expect(reportHasPrivateFields(pub)).toBe(false);
    expect(pub.reportId).toBe("lk_123");
    expect(JSON.stringify(pub)).not.toContain("supplier");
    expect(JSON.stringify(pub)).not.toContain("walletAddress");
  });
});
