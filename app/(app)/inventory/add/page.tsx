import type { Metadata } from "next";
import { AddInventory } from "@/components/inventory/AddInventory";

export const metadata: Metadata = { title: "Add inventory", robots: { index: false, follow: false } };

export default function AddInventoryPage() {
  return <AddInventory />;
}
