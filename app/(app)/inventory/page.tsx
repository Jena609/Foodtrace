import type { Metadata } from "next";
import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";

export const metadata: Metadata = {
  title: "Business inventory",
  description: "Monitor product lots, expiration dates, and recall alerts for a business.",
};

export default function InventoryPage() {
  return <InventoryDashboard />;
}
