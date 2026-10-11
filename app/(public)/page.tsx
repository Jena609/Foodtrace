import type { Metadata } from "next";
import { IntroPage } from "@/components/intro/IntroPage";

export const metadata: Metadata = {
  title: "Know what's happening with the food you buy",
  description: "FoodTrace helps you trace products, check recall information, and understand the evidence behind every result.",
};

export default function Page() {
  return <IntroPage />;
}
