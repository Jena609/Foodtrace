import type { Metadata } from "next";
import { LookupExperience } from "@/components/lookup/LookupExperience";
import type { ProductSearchInput } from "@/lib/types";

export const metadata: Metadata = { title: "Check a product", description: "Look up a food product by barcode, name, brand, lot, expiration date, or region." };
export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LookupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const initial: ProductSearchInput = {
    barcode: one(params.barcode),
    productName: one(params.productName),
    brand: one(params.brand),
    lotNumber: one(params.lotNumber),
    expirationDate: one(params.expirationDate),
    region: one(params.region),
  };
  return <LookupExperience initial={initial} autorun={one(params.autorun) === "1"} />;
}
