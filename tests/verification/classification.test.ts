import { describe, expect, it } from "vitest";
import { evidenceForResult } from "@/lib/lookup/relevance";
import { dataStatus, displayClassification, reviewStatus, sourceAgreement } from "@/lib/verification/classification";
import type { RecallRecordInput } from "@/lib/types";

function record(id: string, barcode: string, lot: string, productName: string): RecallRecordInput {
  return {
    id,
    sourceName: "Demo",
    sourceUrl: "https://demo.foodtrace.invalid/record",
    sourcePriority: 1,
    productName,
    brand: "Demo",
    barcode,
    lotNumbers: [lot],
    recallReason: "Fictional",
    recallDate: "2026-01-01",
    geographicScope: "Demo",
    rawEvidence: "Fictional",
    retrievedAt: "2026-10-11T00:00:00.000Z",
    isDemoData: true,
    recordKind: "recall",
    region: "",
  };
}

describe("verification labels", () => {
  it("maps contract verdicts to public classifications", () => {
    expect(displayClassification("RECALL_FOUND", ["exact_barcode_and_lot"])).toBe("EXACT_RECALL_MATCH");
    expect(displayClassification("RECALL_FOUND", ["exact_product_name_and_brand"])).toBe("PARTIAL_MATCH");
    expect(displayClassification("NO_MATCHING_RECALL_FOUND", [])).toBe("NO_MATCH");
    expect(displayClassification("CONFLICTING_INFORMATION", ["conflicting_sources"])).toBe("CONFLICTING_SOURCES");
    expect(displayClassification("EXPIRED", ["expired"])).toBe("EXPIRED_PRODUCT");
    expect(displayClassification("UNABLE_TO_VERIFY", ["source_unavailable"])).toBe("SOURCE_UNAVAILABLE");
  });

  it("does not call a local result finalized", () => {
    expect(reviewStatus("preliminary", false)).toBe("PENDING");
    expect(reviewStatus("mock", true)).toBe("UNAVAILABLE");
    expect(reviewStatus("finalized", false)).toBe("FINALIZED");
    expect(reviewStatus("failed", false)).toBe("FAILED");
    expect(reviewStatus("unavailable", false)).toBe("UNAVAILABLE");
  });

  it("keeps only evidence that belongs to the searched product", () => {
    const spinach = record("spinach", "0123456789012", "DEMO-SPIN-1001", "North Orchard Organic Baby Spinach");
    const peanut = record("peanut", "0123456789036", "DEMO-PB-3003", "Cedar & Rye Creamy Peanut Butter");
    const kept = evidenceForResult(
      { barcode: "0123456789036", productName: "Cedar & Rye Creamy Peanut Butter", brand: "Cedar & Rye", lotNumber: "DEMO-PB-3003", expirationDate: "", region: "" },
      [spinach, peanut],
      ["peanut"],
    );
    expect(kept.map((item) => item.id)).toEqual(["peanut"]);
  });

  it("shows a conflict when recall and clearance both match", () => {
    const both = [
      { matched: true, recordKind: "recall" },
      { matched: true, recordKind: "clearance" },
    ];
    expect(sourceAgreement("CONFLICTING_INFORMATION", [])).toBe("Sources conflict");
    expect(sourceAgreement("RECALL_FOUND", both)).toBe("Sources conflict");
    expect(displayClassification("RECALL_FOUND", ["exact_barcode_and_lot"], both)).toBe("CONFLICTING_SOURCES");
  });

  it("labels a demo-only check as fictional when no live source ran", () => {
    expect(dataStatus([], [{ demo: true, skipped: false }, { demo: false, skipped: true }])).toBe("Fictional Demo Data");
    expect(dataStatus([], [{ demo: false, skipped: false }])).toBe("Live Data");
  });
});
