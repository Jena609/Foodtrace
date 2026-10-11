import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Product",
  description: "What FoodTrace shows when you check a food product or batch.",
};

export default function ProductPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Product</p>
      <h1 className="mt-3 font-serif text-4xl">Know what the configured sources showed.</h1>
      <p className="mt-4 text-lg leading-8 text-muted">FoodTrace reads product and batch details against the sources configured for a check, then keeps the evidence next to the result. It does not replace the package, the retailer, or an official notice.</p>
      <ul className="mt-8 grid gap-3">
        {[
          ["Check products and batches", "Use the barcode, the name, or the lot printed on the package."],
          ["View recall information", "When a configured source has a matching record, the result says so."],
          ["See evidence sources", "Excerpts, links, and retrieval times stay attached to the result."],
          ["Save verification reports", "A check can be reopened later as a report from this browser."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-[24px] border border-line bg-card px-5 py-4">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
          </li>
        ))}
      </ul>
      <Link href="/lookup" className="mt-8 inline-flex rounded-full bg-pine px-5 py-3 font-semibold text-white">Check a product</Link>
    </main>
  );
}
