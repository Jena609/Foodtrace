import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportDocument } from "@/components/reports/ReportDocument";
import { getLookup } from "@/lib/lookup/service";
import { toPublicReport } from "@/lib/lookup/view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Report ${id}`, description: "Public FoodTrace evidence report. This is not a food-safety certification.", robots: { index: false, follow: false } };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookup = await getLookup(id);
  if (!lookup) notFound();
  return <ReportDocument report={toPublicReport(lookup)} />;
}
