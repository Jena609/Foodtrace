import type { Metadata } from "next";
import { AlertsView } from "@/components/alerts/AlertsView";

export const metadata: Metadata = { title: "Alerts", description: "Recall, expiration, and unverified-product alerts for FoodTrace inventory." };

export default function AlertsPage() {
  return <AlertsView />;
}
