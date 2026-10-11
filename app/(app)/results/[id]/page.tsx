import type { Metadata } from "next";
import { ResultExperience } from "@/components/results/ResultExperience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verification result", robots: { index: false, follow: false } };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultExperience id={id} />;
}
