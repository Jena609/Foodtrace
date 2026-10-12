import { formatEvidenceText } from "@/lib/evidence/format";
import { catalogSearchRecord, demoRecords } from "@/lib/sources/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_TO_RECORD: Record<string, string> = {
  "spinach-gov": "demo-spinach-gov",
  "spinach-duplicate": "demo-spinach-gov-duplicate",
  "spinach-retailer": "demo-spinach-retailer",
  "peanut-gov": "demo-pb-gov",
  "peanut-manufacturer": "demo-pb-manufacturer",
  "flour-gov": "demo-flour-gov",
  "stale-crackers": "demo-stale-crackers",
  "catalog-search": "demo-catalog-search",
};

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const recordId = SLUG_TO_RECORD[slug];
  const record = recordId === "demo-catalog-search" ? catalogSearchRecord() : recordId ? demoRecords().find((item) => item.id === recordId) : undefined;
  if (!record) return new Response("That demo evidence page was not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const body = [
    "Fictional Demo Data. This page is not an official recall notice.",
    formatEvidenceText({
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
      sourcePriority: record.sourcePriority,
      recordKind: record.recordKind,
      productName: record.productName,
      brand: record.brand,
      barcode: record.barcode,
      lotNumbers: record.lotNumbers,
      recallReason: record.recallReason,
      retrievedAt: record.retrievedAt,
      geographicScope: record.geographicScope,
      isDemoData: true,
      evidenceText: record.rawEvidence,
    }),
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-foodtrace-data": "fictional-demo",
    },
  });
}
