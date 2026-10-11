import type { ProductSearchInput, RecallRecordInput, SourceRun } from "@/lib/types";
import { recordsForAdapter } from "@/lib/sources/demo-data";
import { fetchPublicJson } from "@/lib/sources/http";
import { buildOpenFdaUrl, interpretOpenFdaHttp, parseOpenFdaPayload } from "@/lib/sources/openfda";
import { SourceError, withTimeout, type RecallSourceAdapter } from "@/lib/sources/types";
import { sanitizeEvidence } from "@/lib/security/sanitize";
import { assertPublicHttpsUrl } from "@/lib/security/url";

export class DemoRecallSourceAdapter implements RecallSourceAdapter {
  readonly name = "FoodTrace demo catalog";
  readonly region = "Demo";

  async searchProduct(): Promise<RecallRecordInput[]> {
    return recordsForAdapter("all");
  }
}

export class GovernmentRecallSourceAdapter implements RecallSourceAdapter {
  readonly name = "Government food-safety authority";
  readonly region = "Configured";
  constructor(private readonly enabled: boolean) {}

  async searchProduct(input: ProductSearchInput): Promise<RecallRecordInput[]> {
    if (!this.enabled) return [];
    const url = buildOpenFdaUrl(input);
    if (!url) return [];
    const retrievedAt = new Date().toISOString();
    const { status, body } = await fetchPublicJson(url, 8000);
    const interpretation = interpretOpenFdaHttp(status, body);
    if (interpretation === "empty") return [];
    if (interpretation === "error") throw new SourceError("http", "The openFDA food enforcement request failed.");
    return parseOpenFdaPayload(body, retrievedAt, url);
  }
}

interface ExternalRecord {
  productName?: unknown;
  brand?: unknown;
  barcode?: unknown;
  lotNumbers?: unknown;
  recallReason?: unknown;
  recallDate?: unknown;
  sourceUrl?: unknown;
  recordKind?: unknown;
  geographicScope?: unknown;
}

function mapExternalRecords(body: unknown, sourceName: string, priority: number, retrievedAt: string): RecallRecordInput[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { records?: unknown }).records)) {
    throw new SourceError("malformed", `${sourceName} did not return a records array.`);
  }
  const records = (body as { records: ExternalRecord[] }).records.slice(0, 20);
  return records.map((record, index) => {
    const sourceUrl = typeof record.sourceUrl === "string" ? record.sourceUrl : "";
    if (!assertPublicHttpsUrl(sourceUrl)) throw new SourceError("invalid_url", `${sourceName} included an invalid source URL.`);
    const kind = record.recordKind === "clearance" ? "clearance" : "recall";
    const lots = Array.isArray(record.lotNumbers) ? record.lotNumbers.filter((lot): lot is string => typeof lot === "string").slice(0, 20) : [];
    return {
      id: `${sourceName}-${index + 1}`,
      sourceName,
      sourceUrl,
      sourcePriority: priority,
      productName: sanitizeEvidence(String(record.productName ?? "")).slice(0, 180),
      brand: sanitizeEvidence(String(record.brand ?? "")).slice(0, 120),
      barcode: String(record.barcode ?? "").replace(/\D/g, "").slice(0, 14),
      lotNumbers: lots.map((lot) => sanitizeEvidence(lot).slice(0, 64)),
      recallReason: sanitizeEvidence(String(record.recallReason ?? "")),
      recallDate: sanitizeEvidence(String(record.recallDate ?? "")).slice(0, 32),
      geographicScope: sanitizeEvidence(String(record.geographicScope ?? "")),
      rawEvidence: sanitizeEvidence(String(record.recallReason ?? record.productName ?? "")),
      retrievedAt,
      isDemoData: false,
      recordKind: kind,
      region: "",
    };
  });
}

export class ManufacturerRecallSourceAdapter implements RecallSourceAdapter {
  readonly name = "Manufacturer recall notice";
  readonly region = "Configured";
  constructor(private readonly endpoint: string) {}

  async searchProduct(): Promise<RecallRecordInput[]> {
    if (!this.endpoint) return [];
    const { status, body } = await fetchPublicJson(this.endpoint, 8000);
    if (status < 200 || status >= 300) throw new SourceError("http", "The manufacturer source request failed.");
    return mapExternalRecords(body, this.name, 2, new Date().toISOString());
  }
}

export class RetailerRecallSourceAdapter implements RecallSourceAdapter {
  readonly name = "Retailer or distributor alert";
  readonly region = "Configured";
  constructor(private readonly endpoint: string) {}

  async searchProduct(): Promise<RecallRecordInput[]> {
    if (!this.endpoint) return [];
    const { status, body } = await fetchPublicJson(this.endpoint, 8000);
    if (status < 200 || status >= 300) throw new SourceError("http", "The retailer source request failed.");
    return mapExternalRecords(body, this.name, 4, new Date().toISOString());
  }
}

export interface AdapterPlan {
  adapter: RecallSourceAdapter;
  skipped: boolean;
  demo: boolean;
  detail?: string;
}

export function adapterPlan(env: Record<string, string | undefined> = process.env): AdapterPlan[] {
  const openFda = env.FOODTRACE_OPENFDA_ENABLED === "true";
  const manufacturer = env.FOODTRACE_MANUFACTURER_API_URL?.trim() ?? "";
  const retailer = env.FOODTRACE_RETAILER_API_URL?.trim() ?? "";
  return [
    { adapter: new DemoRecallSourceAdapter(), skipped: false, demo: true, detail: "Fictional demo catalog. These records are not real recalls." },
    {
      adapter: new GovernmentRecallSourceAdapter(openFda),
      skipped: !openFda,
      demo: false,
      detail: openFda ? "openFDA food enforcement API." : "Live government API is off. Set FOODTRACE_OPENFDA_ENABLED=true.",
    },
    {
      adapter: new ManufacturerRecallSourceAdapter(manufacturer),
      skipped: !manufacturer,
      demo: false,
      detail: manufacturer ? "Configured manufacturer endpoint." : "No FOODTRACE_MANUFACTURER_API_URL is configured.",
    },
    {
      adapter: new RetailerRecallSourceAdapter(retailer),
      skipped: !retailer,
      demo: false,
      detail: retailer ? "Configured retailer endpoint." : "No FOODTRACE_RETAILER_API_URL is configured.",
    },
  ];
}

export async function collectRecallRecords(
  input: ProductSearchInput,
  plans = adapterPlan(),
  timeoutMs = 8000,
): Promise<{ records: RecallRecordInput[]; sources: SourceRun[] }> {
  const settled = await Promise.all(
    plans.map(async (plan): Promise<{ records: RecallRecordInput[]; source: SourceRun }> => {
      if (plan.skipped) {
        return {
          records: [],
          source: { name: plan.adapter.name, region: plan.adapter.region, ok: true, skipped: true, demo: plan.demo, detail: plan.detail },
        };
      }
      try {
        const records = await withTimeout(plan.adapter.searchProduct(input), timeoutMs, plan.adapter.name);
        return {
          records,
          source: { name: plan.adapter.name, region: plan.adapter.region, ok: true, demo: plan.demo, detail: plan.detail },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "The source failed.";
        return {
          records: [],
          source: { name: plan.adapter.name, region: plan.adapter.region, ok: false, demo: plan.demo, error: message, detail: plan.detail },
        };
      }
    }),
  );
  return {
    records: settled.flatMap((item) => item.records),
    sources: settled.map((item) => item.source),
  };
}
