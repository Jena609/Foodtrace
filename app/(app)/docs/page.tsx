import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/PageFrame";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How FoodTrace checks products, labels demo data, and uses GenLayer Studio Next.",
};

export default function DocsPage() {
  return (
    <PageFrame kicker="Documentation" title="How FoodTrace works" lede="FoodTrace compares a product against configured recall sources and keeps the evidence visible. It is not a food-safety authority.">
      <div className="grid gap-4">
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">A check</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
            <li>Enter a barcode, product name, brand, lot, expiration date, or region. A wallet is not required.</li>
            <li>Each configured source adapter returns records or a skip/failure. The fictional demo catalog always responds and is labeled.</li>
            <li>Deterministic matching prefers exact barcode plus lot, then lot, then barcode, then name and brand. Semantic name matching cannot override a stronger exact identifier.</li>
            <li>The result is one of: recall found, no matching recall found, expired, conflicting information, or unable to verify.</li>
          </ol>
          <Link className="mt-4 inline-block font-semibold text-lake" href="/lookup">Check a product</Link>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Sources</h2>
          <p className="mt-2 text-sm leading-6">Government, manufacturer, and retailer adapters run only when their environment variables are set. openFDA is off unless FOODTRACE_OPENFDA_ENABLED is true. Unconfigured adapters are skipped. A failed configured source can make the result “unable to verify” when nothing else matched. FoodTrace does not scrape sites.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">GenLayer</h2>
          <p className="mt-2 text-sm leading-6">Mock mode evaluates locally and labels the result MOCK RESULT. Studio mode uses GenLayer Studio Next, chain 61997, and the contract address you deploy. If the RPC or contract is missing, the app says verification is unavailable and does not fall back to mock. A result is shown as finalized only after that transaction’s evaluation is read back.</p>
        </article>
        <article className="ft-card p-5">
          <h2 className="font-serif text-2xl">Businesses</h2>
          <p className="mt-2 text-sm leading-6">Inventory, alerts, and appeals that change records require a wallet signature. Public reports omit supplier, quantity, email, and wallet address.</p>
        </article>
      </div>
    </PageFrame>
  );
}
