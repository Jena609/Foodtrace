import { describe, expect, it } from "vitest";
import { sanitizeEvidence } from "@/lib/security/sanitize";
import { assertPublicHttpsUrl, isFetchablePublicUrl } from "@/lib/security/url";
import { formatEvidenceText, parseEvidenceDocument } from "@/lib/evidence/format";
import { buildOpenFdaUrl, interpretOpenFdaHttp, parseOpenFdaPayload } from "@/lib/sources/openfda";
import { SourceError, withTimeout } from "@/lib/sources/types";
import { collectRecallRecords, type AdapterPlan } from "@/lib/sources/adapters";
import type { RecallSourceAdapter } from "@/lib/sources/types";

const search = {
  barcode: "",
  productName: "spinach",
  brand: "",
  lotNumber: "",
  expirationDate: "",
  region: "",
};

describe("source safeguards", () => {
  it("times out a source that does not respond", async () => {
    const pending = new Promise<string>(() => undefined);
    await expect(withTimeout(pending, 20, "Slow source")).rejects.toMatchObject({ code: "timeout" });
  });

  it("rejects a malformed openFDA payload", () => {
    expect(() => parseOpenFdaPayload({ results: "nope" }, "2026-10-11T00:00:00.000Z", "https://api.fda.gov/food/enforcement.json")).toThrow(SourceError);
    expect(interpretOpenFdaHttp(404, { error: { code: "NOT_FOUND" } })).toBe("empty");
    expect(interpretOpenFdaHttp(500, {})).toBe("error");
    expect(interpretOpenFdaHttp(200, { results: [] })).toBe("ok");
  });

  it("strips untrusted HTML from evidence text", () => {
    const cleaned = sanitizeEvidence('<script>alert(1)</script><b onclick="steal()">Spinach</b> javascript:alert(1)');
    expect(cleaned).not.toContain("<script>");
    expect(cleaned).not.toContain("<b");
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).toContain("Spinach");
  });

  it("rejects invalid and private URLs", () => {
    expect(assertPublicHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(assertPublicHttpsUrl("http://example.com/recall")).toBeNull();
    expect(assertPublicHttpsUrl("https://localhost/recall")).toBeNull();
    expect(assertPublicHttpsUrl("https://10.0.0.8/recall")).toBeNull();
    expect(assertPublicHttpsUrl("https://api.fda.gov/food/enforcement.json")).not.toBeNull();
    expect(isFetchablePublicUrl("https://demo.foodtrace.invalid/government/spinach")).toBe(false);
  });

  it("round-trips a FoodTrace evidence document", () => {
    const text = formatEvidenceText({
      sourceName: "Demo Government Food-Safety Authority",
      sourceUrl: "https://demo.foodtrace.invalid/government/spinach",
      sourcePriority: 1,
      recordKind: "recall",
      productName: "North Orchard Organic Baby Spinach",
      brand: "North Orchard",
      barcode: "0123456789012",
      lotNumbers: ["DEMO-SPIN-1001"],
      recallReason: "Fictional demo",
      retrievedAt: "2026-10-11T00:00:00.000Z",
      geographicScope: "Fictional demo region",
      isDemoData: true,
      evidenceText: "Lot DEMO-SPIN-1001",
    });
    const parsed = parseEvidenceDocument(text, "https://demo.foodtrace.invalid/government/spinach");
    expect(parsed?.lotNumbers).toEqual(["DEMO-SPIN-1001"]);
    expect(parsed?.isDemoData).toBe(true);
    expect(parsed?.recordKind).toBe("recall");
  });

  it("builds a bounded openFDA query and parses a real-shaped payload", () => {
    const url = buildOpenFdaUrl({ barcode: "", productName: "baby spinach", brand: "North", lotNumber: "DEMO-SPIN-1001" });
    expect(url).toContain("https://api.fda.gov/food/enforcement.json");
    expect(url).toContain("limit=5");
    const records = parseOpenFdaPayload(
      {
        results: [
          {
            recall_number: "F-0001-2026",
            product_description: "<b>Baby spinach</b>",
            recalling_firm: "Example Foods",
            reason_for_recall: "Test reason",
            code_info: "DEMO-SPIN-1001",
            recall_initiation_date: "20260901",
            distribution_pattern: "United States",
            country: "United States",
          },
        ],
      },
      "2026-10-11T00:00:00.000Z",
      "https://api.fda.gov/food/enforcement.json?search=test",
    );
    expect(records[0]?.isDemoData).toBe(false);
    expect(records[0]?.sourcePriority).toBe(1);
    expect(records[0]?.productName).not.toContain("<b>");
    expect(records[0]?.lotNumbers).toContain("DEMO-SPIN-1001");
  });

  it("keeps a timed-out adapter from failing the whole collection", async () => {
    const slow: RecallSourceAdapter = {
      name: "Slow government source",
      region: "US",
      searchProduct: () => new Promise(() => undefined),
    };
    const plans: AdapterPlan[] = [{ adapter: slow, skipped: false, demo: false }];
    const collected = await collectRecallRecords(search, plans, 20);
    expect(collected.records).toEqual([]);
    expect(collected.sources[0]?.ok).toBe(false);
    expect(collected.sources[0]?.error).toContain("timed out");
  });
});
