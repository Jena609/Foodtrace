import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description: "How a FoodTrace check moves from product details to a result.",
};

const steps = [
  ["01", "Enter the product", "Barcode, name, brand, lot, date, or region. The same check you already use."],
  ["02", "Check trusted sources", "Configured public sources are read separately. Demo records stay labeled."],
  ["03", "Evaluate the evidence", "Exact identifiers win. A missing lot is not treated as a clear result."],
  ["04", "See the result", "You get the status, the wording, and the excerpts behind it."],
];

export default function HowItWorksPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">How it works</p>
      <h1 className="mt-3 max-w-xl font-serif text-4xl">Four steps from a package to a result</h1>
      <ol className="mt-10 grid gap-4 md:grid-cols-2">
        {steps.map(([number, title, body]) => (
          <li key={number} className="rounded-[28px] border border-line bg-card p-6">
            <p className="font-serif text-3xl text-lake">{number}</p>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </li>
        ))}
      </ol>
      <Link href="/lookup" className="mt-8 inline-flex rounded-full bg-pine px-5 py-3 font-semibold text-white">Check a product</Link>
    </main>
  );
}
