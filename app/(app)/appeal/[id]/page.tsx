import type { Metadata } from "next";
import { AppealForm } from "@/components/appeals/AppealForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Appeal a result", robots: { index: false, follow: false } };

export default async function AppealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AppealForm id={id} />;
}
