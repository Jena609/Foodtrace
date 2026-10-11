import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trust & Evidence",
  description: "What FoodTrace keeps with a verification result.",
};

const steps = [
  ["Source checked", "The source name and address stay with the excerpt."],
  ["Evidence found", "The record text is kept, including when it is demo data."],
  ["Timestamp", "Retrieval time is stored with the evidence."],
  ["Verification result", "The status names the outcome and the criteria that fired."],
];

export default function TrustEvidencePage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Trust & Evidence</p>
      <h1 className="mt-3 font-serif text-4xl">Every result should be traceable to what was checked.</h1>
      <p className="mt-4 text-muted">This is the shape of a report. It is not a promise that every public source was complete.</p>
      <ol className="mt-8 grid gap-4">
        {steps.map(([title, body], index) => (
          <li key={title} className="rounded-[24px] border border-line bg-card p-5">
            <p className="text-sm font-semibold text-pine">{index + 1}</p>
            <h2 className="mt-2 font-serif text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </li>
        ))}
      </ol>
      <Link href="/lookup" className="mt-8 inline-flex rounded-full bg-pine px-5 py-3 font-semibold text-white">Check a product</Link>
    </main>
  );
}
