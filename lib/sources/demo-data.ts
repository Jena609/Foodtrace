import type { ProductSearchInput, RecallRecordInput } from "@/lib/types";

export interface ExampleSearch {
  id: string;
  label: string;
  description: string;
  input: ProductSearchInput;
}

const PUBLIC_DEMO_SLUG: Record<string, string> = {
  "demo-spinach-gov": "spinach-gov",
  "demo-spinach-gov-duplicate": "spinach-duplicate",
  "demo-spinach-retailer": "spinach-retailer",
  "demo-pb-gov": "peanut-gov",
  "demo-pb-manufacturer": "peanut-manufacturer",
  "demo-flour-gov": "flour-gov",
  "demo-stale-crackers": "stale-crackers",
  "demo-catalog-search": "catalog-search",
};

export function demoEvidenceUrl(id: string, fallbackPath: string): string {
  const slug = PUBLIC_DEMO_SLUG[id];
  const app = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
  if (slug && app.startsWith("https://")) return `${app}/api/evidence/demo/${slug}`;
  return `https://demo.foodtrace.invalid/${fallbackPath}`;
}

export function catalogSearchRecord(now = new Date()): RecallRecordInput {
  return {
    id: "demo-catalog-search",
    sourceName: "FoodTrace Demo Catalog",
    sourceUrl: demoEvidenceUrl("demo-catalog-search", "catalog/search"),
    sourcePriority: 6,
    productName: "FoodTrace catalog receipt",
    brand: "FoodTrace Demo",
    barcode: "",
    lotNumbers: [],
    recallReason: "Fictional Demo Data. This page is the search receipt for the demo catalog. It is not an official recall notice and it does not name a recalled product.",
    recallDate: "",
    geographicScope: "Fictional demo catalog",
    rawEvidence: "Fictional Demo Data. The demo catalog was searched. No product-specific recall record was stored for this check. This page is not a government recall.",
    retrievedAt: now.toISOString(),
    isDemoData: true,
    recordKind: "context",
    region: "",
  };
}

export function demoRecords(now = new Date()): RecallRecordInput[] {
  const fresh = now.toISOString();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const stale = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: "demo-spinach-gov",
      sourceName: "Demo Government Food-Safety Authority",
      sourceUrl: demoEvidenceUrl("demo-spinach-gov", "government/north-orchard-spinach"),
      sourcePriority: 1,
      productName: "North Orchard Organic Baby Spinach",
      brand: "North Orchard",
      barcode: "0123456789012",
      lotNumbers: ["DEMO-SPIN-1001"],
      recallReason: "Fictional demo record only. It describes a made-up Listeria concern and is not a real recall.",
      recallDate: "2026-09-01",
      geographicScope: "Fictional demo region",
      rawEvidence: "Demo Government Food-Safety Authority lists lot DEMO-SPIN-1001 of North Orchard Organic Baby Spinach. This text is fictional.",
      retrievedAt: fresh,
      isDemoData: true,
      recordKind: "recall",
      region: "",
    },
    {
      id: "demo-spinach-gov-duplicate",
      sourceName: "Demo Government Food-Safety Authority",
      sourceUrl: demoEvidenceUrl("demo-spinach-gov-duplicate", "government/north-orchard-spinach-duplicate"),
      sourcePriority: 1,
      productName: "North Orchard Organic Baby Spinach",
      brand: "North Orchard",
      barcode: "0123456789012",
      lotNumbers: ["DEMO-SPIN-1001"],
      recallReason: "Fictional demo record only. It describes a made-up Listeria concern and is not a real recall.",
      recallDate: "2026-09-01",
      geographicScope: "Fictional demo region",
      rawEvidence: "Older duplicate of the fictional North Orchard spinach demo record.",
      retrievedAt: yesterday,
      isDemoData: true,
      recordKind: "recall",
      region: "",
    },
    {
      id: "demo-spinach-retailer",
      sourceName: "Demo Retailer Alert",
      sourceUrl: demoEvidenceUrl("demo-spinach-retailer", "retailer/north-orchard-spinach"),
      sourcePriority: 4,
      productName: "North Orchard Organic Baby Spinach",
      brand: "North Orchard",
      barcode: "0123456789012",
      lotNumbers: ["DEMO-SPIN-1001"],
      recallReason: "Fictional retailer alert repeating the demo spinach lot. Not a real retailer notice.",
      recallDate: "2026-09-02",
      geographicScope: "Fictional demo region",
      rawEvidence: "Demo retailer shelf alert for lot DEMO-SPIN-1001. Fictional.",
      retrievedAt: fresh,
      isDemoData: true,
      recordKind: "recall",
      region: "",
    },
    {
      id: "demo-pb-gov",
      sourceName: "Demo Government Food-Safety Authority",
      sourceUrl: demoEvidenceUrl("demo-pb-gov", "government/cedar-rye-peanut-butter"),
      sourcePriority: 1,
      productName: "Cedar & Rye Creamy Peanut Butter",
      brand: "Cedar & Rye",
      barcode: "0123456789036",
      lotNumbers: ["DEMO-PB-3003"],
      recallReason: "Fictional demo recall for a made-up undeclared allergen. Not a real recall.",
      recallDate: "2026-08-12",
      geographicScope: "Fictional demo region",
      rawEvidence: "Demo government record for Cedar & Rye lot DEMO-PB-3003. Fictional.",
      retrievedAt: fresh,
      isDemoData: true,
      recordKind: "recall",
      region: "",
    },
    {
      id: "demo-pb-manufacturer",
      sourceName: "Demo Manufacturer Notice",
      sourceUrl: demoEvidenceUrl("demo-pb-manufacturer", "manufacturer/cedar-rye-peanut-butter"),
      sourcePriority: 2,
      productName: "Cedar & Rye Creamy Peanut Butter",
      brand: "Cedar & Rye",
      barcode: "0123456789036",
      lotNumbers: ["DEMO-PB-3003"],
      recallReason: "Fictional manufacturer clearance. The demo manufacturer says this lot is outside the made-up recall. Not a real notice.",
      recallDate: "2026-08-14",
      geographicScope: "Fictional demo region",
      rawEvidence: "Demo manufacturer clearance for lot DEMO-PB-3003. Fictional and in conflict with the demo government record.",
      retrievedAt: fresh,
      isDemoData: true,
      recordKind: "clearance",
      region: "",
    },
    {
      id: "demo-flour-gov",
      sourceName: "Demo Government Food-Safety Authority",
      sourceUrl: demoEvidenceUrl("demo-flour-gov", "government/mesa-grain-flour"),
      sourcePriority: 1,
      productName: "Mesa Grain All-Purpose Flour",
      brand: "Mesa Grain",
      barcode: "0123456789043",
      lotNumbers: [],
      recallReason: "Fictional product-wide demo recall. No lot list is published in this demo record. Not a real recall.",
      recallDate: "2026-07-20",
      geographicScope: "Fictional demo region",
      rawEvidence: "Demo government record for Mesa Grain All-Purpose Flour, barcode 0123456789043, all lots in the fictional notice.",
      retrievedAt: fresh,
      isDemoData: true,
      recordKind: "recall",
      region: "",
    },
    {
      id: "demo-stale-crackers",
      sourceName: "Demo Government Food-Safety Authority",
      sourceUrl: demoEvidenceUrl("demo-stale-crackers", "government/stale-sample-crackers"),
      sourcePriority: 1,
      productName: "Stale Sample Crackers",
      brand: "Stale Sample",
      barcode: "0123456789050",
      lotNumbers: ["DEMO-STALE-1"],
      recallReason: "Fictional demo recall whose retrieved copy is intentionally old. Not a real recall.",
      recallDate: "2024-01-15",
      geographicScope: "Fictional demo region",
      rawEvidence: "Stale fictional retrieval for Stale Sample Crackers lot DEMO-STALE-1.",
      retrievedAt: stale,
      isDemoData: true,
      recordKind: "recall",
      region: "",
    },
  ];
}

export const EXAMPLE_SEARCHES: ExampleSearch[] = [
  {
    id: "spinach-recall",
    label: "Demo recall, exact lot",
    description: "Fictional spinach lot used to show a recall match.",
    input: {
      barcode: "0123456789012",
      productName: "North Orchard Organic Baby Spinach",
      brand: "North Orchard",
      lotNumber: "DEMO-SPIN-1001",
      expirationDate: "2026-12-01",
      region: "United States",
    },
  },
  {
    id: "milk-clear",
    label: "Demo, no matching recall",
    description: "Fictional milk with no demo recall record.",
    input: {
      barcode: "0123456789029",
      productName: "Harbor Mill Whole Milk",
      brand: "Harbor Mill",
      lotNumber: "DEMO-MILK-2002",
      expirationDate: "2026-11-02",
      region: "United States",
    },
  },
  {
    id: "peanut-conflict",
    label: "Demo conflicting sources",
    description: "Fictional peanut butter where two demo sources disagree.",
    input: {
      barcode: "0123456789036",
      productName: "Cedar & Rye Creamy Peanut Butter",
      brand: "Cedar & Rye",
      lotNumber: "DEMO-PB-3003",
      expirationDate: "2027-01-15",
      region: "United States",
    },
  },
  {
    id: "expired-oysters",
    label: "Demo expired date",
    description: "Fictional product whose date is already past.",
    input: {
      barcode: "",
      productName: "Low Country Smoked Oysters",
      brand: "Low Country",
      lotNumber: "DEMO-OYS-4004",
      expirationDate: "2024-06-01",
      region: "United States",
    },
  },
];

export function recordsForAdapter(kind: "all" | "government" | "manufacturer" | "retailer", now = new Date()): RecallRecordInput[] {
  const records = demoRecords(now);
  if (kind === "all") return records;
  if (kind === "government") return records.filter((record) => record.sourceName.includes("Government"));
  if (kind === "manufacturer") return records.filter((record) => record.sourceName.includes("Manufacturer"));
  return records.filter((record) => record.sourceName.includes("Retailer"));
}
