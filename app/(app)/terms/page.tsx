import type { Metadata } from "next";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { PageFrame } from "@/components/shared/PageFrame";

export const metadata: Metadata = { title: "Terms", description: "FoodTrace terms and the safety disclaimer for product checks." };

export default function TermsPage() {
  return (
    <PageFrame kicker="Terms" title="Using FoodTrace" lede="FoodTrace organizes recall evidence from configured sources. You decide what to do with a product.">
      <div className="grid gap-4 text-sm leading-6">
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Results</h2>
          <p className="mt-2">A result describes what the configured sources showed at a specific time. “No matching recall found” is not a statement that a product is safe. Conflicting or missing evidence stays visible.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Demo data</h2>
          <p className="mt-2">The built-in catalog uses fictional products and fictional recall notices. Those records are labeled demo data. They are not official recalls.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Accounts and wallets</h2>
          <p className="mt-2">You can check a product without a wallet. Wallet signatures are required for studio verification, appeals that are submitted on-chain, and business inventory changes. You can reject a signature. FoodTrace never asks you to paste a seed phrase.</p>
        </article>
        <div id="disclaimer"><Disclaimer /></div>
      </div>
    </PageFrame>
  );
}
