import { describe, expect, it } from "vitest";
import { decideMatch, prepareRecords } from "@/lib/matching/engine";
import type { ProductSearchInput, RecallRecordInput, SourceRun } from "@/lib/types";

const NOW = new Date("2026-10-11T12:00:00.000Z");

function input(partial: Partial<ProductSearchInput>): ProductSearchInput {
  return {
    barcode: "",
    productName: "",
    brand: "",
    lotNumber: "",
    expirationDate: "",
    region: "",
    ...partial,
  };
}

function record(partial: Partial<RecallRecordInput>): RecallRecordInput {
  return {
    id: partial.id ?? "record-1",
    sourceName: partial.sourceName ?? "Demo Government Food-Safety Authority",
    sourceUrl: partial.sourceUrl ?? "https://demo.foodtrace.invalid/record",
    sourcePriority: partial.sourcePriority ?? 1,
    productName: partial.productName ?? "Green Valley Organic Baby Spinach",
    brand: partial.brand ?? "Green Valley",
    barcode: partial.barcode ?? "",
    lotNumbers: partial.lotNumbers ?? [],
    recallReason: partial.recallReason ?? "Fictional test record",
    recallDate: partial.recallDate ?? "2026-09-01",
    geographicScope: partial.geographicScope ?? "Test",
    rawEvidence: partial.rawEvidence ?? "Fictional test evidence",
    retrievedAt: partial.retrievedAt ?? NOW.toISOString(),
    isDemoData: partial.isDemoData ?? true,
    recordKind: partial.recordKind ?? "recall",
    region: partial.region ?? "",
  };
}

const okSource: SourceRun = { name: "Test source", region: "Test", ok: true, demo: true };
const liveSource: SourceRun = { name: "openFDA", region: "US", ok: true, demo: false };

describe("matching engine", () => {
  it("matches an exact barcode and lot before weaker names", () => {
    const decision = decideMatch(
      input({ barcode: "0123456789012", lotNumber: "LOT-100", productName: "Unrelated crackers", brand: "Other" }),
      [
        record({ id: "exact", barcode: "0123456789012", lotNumbers: ["LOT-100"], productName: "Green Valley Organic Baby Spinach" }),
        record({ id: "name", productName: "Unrelated Crackers", brand: "Other", sourcePriority: 2 }),
      ],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("RECALL_FOUND");
    expect(decision.confidence).toBe("high");
    expect(decision.matchedCriteria).toContain("exact_barcode_and_lot");
    expect(decision.matchedRecordIds).toContain("exact");
    expect(decision.matchedRecordIds).not.toContain("name");
  });

  it("matches an exact barcode on a product-wide record", () => {
    const decision = decideMatch(
      input({ barcode: "0123456789043", productName: "Mesa Grain All-Purpose Flour", brand: "Mesa Grain" }),
      [record({ barcode: "0123456789043", productName: "Mesa Grain All-Purpose Flour", brand: "Mesa Grain", lotNumbers: [] })],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("RECALL_FOUND");
    expect(decision.matchedCriteria).toContain("exact_barcode");
  });

  it("matches an exact lot number", () => {
    const decision = decideMatch(
      input({ lotNumber: "demo-spin-1001", brand: "Green Valley", productName: "Green Valley Organic Baby Spinach" }),
      [record({ lotNumbers: ["DEMO-SPIN-1001"] })],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("RECALL_FOUND");
    expect(decision.matchedCriteria).toContain("exact_lot_number");
    expect(decision.confidence).toBe("high");
  });

  it("matches an exact product name and brand, including reordered words", () => {
    const decision = decideMatch(
      input({ productName: "Green Valley Baby Spinach Organic", brand: "Green Valley" }),
      [record({ productName: "Green Valley Organic Baby Spinach", brand: "Green Valley", lotNumbers: [] })],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("RECALL_FOUND");
    expect(decision.matchedCriteria).toContain("exact_product_name_and_brand");
  });

  it("does not treat a brand mismatch as a recall", () => {
    const decision = decideMatch(
      input({ productName: "GV Organic Spinach 5 oz", brand: "Other Foods" }),
      [record({ productName: "Green Valley Organic Baby Spinach", brand: "Green Valley", lotNumbers: [] })],
      [okSource],
      NOW,
    );
    expect(decision.status).not.toBe("RECALL_FOUND");
    expect(decision.matchedCriteria).toContain("brand_mismatch");
  });

  it("accepts a semantic name match when the brand agrees", () => {
    const decision = decideMatch(
      input({ productName: "GV Organic Spinach 5 oz", brand: "Green Valley" }),
      [record({ productName: "Green Valley Organic Baby Spinach", brand: "Green Valley", lotNumbers: [] })],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("RECALL_FOUND");
    expect(decision.confidence).toBe("low");
    expect(decision.matchedCriteria).toContain("semantic_product_name");
  });

  it("returns expired when the date has passed and no recall matches", () => {
    const decision = decideMatch(
      input({ productName: "Low Country Smoked Oysters", brand: "Low Country", lotNumber: "DEMO-OYS-4004", expirationDate: "2024-06-01" }),
      [],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("EXPIRED");
    expect(decision.matchedCriteria).toContain("expired");
    expect(decision.reasoningSummary).toContain("No matching recall was found");
  });

  it("returns conflicting information when an official recall and clearance cover the same identifiers", () => {
    const decision = decideMatch(
      input({ barcode: "0123456789036", lotNumber: "DEMO-PB-3003", productName: "Cedar & Rye Creamy Peanut Butter", brand: "Cedar & Rye" }),
      [
        record({ id: "gov", barcode: "0123456789036", lotNumbers: ["DEMO-PB-3003"], recordKind: "recall", sourcePriority: 1 }),
        record({
          id: "mfr",
          barcode: "0123456789036",
          lotNumbers: ["DEMO-PB-3003"],
          recordKind: "clearance",
          sourceName: "Demo Manufacturer Notice",
          sourcePriority: 2,
        }),
      ],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("CONFLICTING_INFORMATION");
    expect(decision.reasoningSummary).toContain("conflicting information");
  });

  it("does not treat a missing lot as proof that no recall applies", () => {
    const decision = decideMatch(
      input({ barcode: "0123456789012", productName: "Green Valley Organic Baby Spinach", brand: "Green Valley" }),
      [record({ barcode: "0123456789012", lotNumbers: ["DEMO-SPIN-1001"] })],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("UNABLE_TO_VERIFY");
    expect(decision.matchedCriteria).toContain("missing_lot");
    expect(decision.status).not.toBe("NO_MATCHING_RECALL_FOUND");
  });

  it("returns no matching recall when sources respond without a match", () => {
    const decision = decideMatch(
      input({ productName: "Harbor Mill Whole Milk", brand: "Harbor Mill", lotNumber: "DEMO-MILK-2002" }),
      [],
      [liveSource],
      NOW,
    );
    expect(decision.status).toBe("NO_MATCHING_RECALL_FOUND");
    expect(decision.reasoningSummary).toContain("No matching recall was found in the configured sources as of 2026-10-11T12:00:00.000Z");
    expect(decision.reasoningSummary.toUpperCase()).not.toContain("SAFE");
  });

  it("flags stale evidence and lowers confidence", () => {
    const decision = decideMatch(
      input({ lotNumber: "DEMO-STALE-1", brand: "Stale Sample", productName: "Stale Sample Crackers" }),
      [record({
        productName: "Stale Sample Crackers",
        brand: "Stale Sample",
        lotNumbers: ["DEMO-STALE-1"],
        retrievedAt: "2026-08-01T00:00:00.000Z",
      })],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("RECALL_FOUND");
    expect(decision.stale).toBe(true);
    expect(decision.confidence).toBe("low");
    expect(decision.matchedCriteria).toContain("stale_evidence");
  });

  it("collapses duplicate records from the same source", () => {
    const older = record({ id: "old", retrievedAt: "2026-10-10T00:00:00.000Z" });
    const newer = record({ id: "new", retrievedAt: "2026-10-11T00:00:00.000Z" });
    const prepared = prepareRecords([older, newer]);
    expect(prepared.collapsed).toBe(1);
    expect(prepared.records).toHaveLength(1);
    expect(prepared.records[0]?.id).toBe("new");

    const decision = decideMatch(
      input({ barcode: "0123456789012", lotNumber: "LOT-1" }),
      [record({ id: "old", barcode: "0123456789012", lotNumbers: ["LOT-1"], retrievedAt: "2026-10-10T00:00:00.000Z" }), record({ id: "new", barcode: "0123456789012", lotNumbers: ["LOT-1"], retrievedAt: "2026-10-11T00:00:00.000Z" })],
      [okSource],
      NOW,
    );
    expect(decision.matchedCriteria).toContain("duplicate_collapsed");
    expect(decision.matchedRecordIds).toEqual(["new"]);
  });

  it("does not let a semantic match override an exact barcode that identifies a different lot", () => {
    const decision = decideMatch(
      input({ barcode: "0123456789012", lotNumber: "OTHER-LOT", productName: "Green Valley Organic Baby Spinach", brand: "Green Valley" }),
      [
        record({ id: "barcode", barcode: "0123456789012", lotNumbers: ["DEMO-SPIN-1001"], productName: "Green Valley Organic Baby Spinach" }),
        record({ id: "semantic", productName: "Green Valley Organic Baby Spinach", brand: "Green Valley", lotNumbers: [], sourcePriority: 6, sourceName: "Unverified blog" }),
      ],
      [okSource],
      NOW,
    );
    expect(decision.status).toBe("NO_MATCHING_RECALL_FOUND");
    expect(decision.matchedRecordIds).not.toContain("semantic");
  });
});
