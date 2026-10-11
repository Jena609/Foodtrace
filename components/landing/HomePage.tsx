import Link from "next/link";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Reveal } from "@/components/landing/Reveal";
import { StatusMark } from "@/components/shared/StatusMark";
import type { VerdictStatus } from "@/lib/types";

const steps = [
  ["01", "Enter the product", "Barcode, name, brand, lot, date, or region. The same check you already use."],
  ["02", "Check trusted sources", "Configured public sources are read separately. Demo records stay labeled."],
  ["03", "Evaluate the evidence", "Exact identifiers win. A missing lot is not treated as a clear result."],
  ["04", "See the result", "You get the status, the wording, and the excerpts behind it."],
];

const examples: Array<{ status: VerdictStatus; product: string; text: string }> = [
  { status: "RECALL_FOUND", product: "Fictional spinach, lot DEMO-SPIN-1001", text: "A demo lot matched a fictional recall record. This is not a real notice." },
  { status: "NO_MATCHING_RECALL_FOUND", product: "Fictional milk, lot DEMO-MILK-2002", text: "No matching recall was found in the fictional demo catalog at the time of the sample." },
  { status: "CONFLICTING_INFORMATION", product: "Fictional peanut butter, lot DEMO-PB-3003", text: "The sample sources do not agree. FoodTrace keeps both excerpts." },
  { status: "UNABLE_TO_VERIFY", product: "Fictional crackers, lot left blank", text: "A missing lot, a failed source, or unusable evidence ends as unable to verify." },
];

export function HomePage() {
  return (
    <>
      <main id="main">
        <Hero />

        <section id="how-it-works" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">How it works</p>
              <h2 className="mt-3 max-w-xl font-serif text-4xl">Four steps from a package to a result</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {steps.map(([number, title, body], index) => (
                <Reveal key={number} delay={index * 0.06} className="h-full">
                  <article className="h-full rounded-[28px] border border-line bg-paper p-6">
                    <p className="font-serif text-3xl text-lake">{number}</p>
                    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Result preview</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl">What a result can look like</h2>
            <p className="mt-3 max-w-2xl text-muted">These cards use the fictional demo catalog. They are examples of wording, not live checks.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {examples.map((example, index) => (
              <Reveal key={example.status} delay={index * 0.05}>
                <article className="ft-card h-full p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusMark status={example.status} />
                    <span className="rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber">Demo</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{example.product}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{example.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-[#fbf8f3]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">For consumers</p>
              <h2 className="mt-3 font-serif text-4xl leading-tight">Check a package before you decide what to do with it.</h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-muted">FoodTrace is a way to read product and batch information next to the sources that were checked. It does not replace the package, the retailer, or an official notice.</p>
              <Link href="/lookup" className="mt-6 inline-flex rounded-full bg-pine px-5 py-3 font-semibold text-white transition hover:bg-pine-dark">Check a Product</Link>
            </Reveal>
            <div className="grid gap-3">
              {[
                ["Check products and batches", "Use the barcode, the name, or the lot printed on the package."],
                ["View recall information", "When a configured source has a matching record, the result says so."],
                ["See evidence sources", "Excerpts, links, and retrieval times stay attached to the result."],
                ["Save verification reports", "A check can be reopened later as a report from this browser."],
              ].map(([title, body], index) => (
                <Reveal key={title} delay={index * 0.05}>
                  <article className="rounded-[24px] border border-line bg-card px-5 py-4">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="businesses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">For businesses</p>
              <h2 className="mt-3 font-serif text-4xl">Keep lots, dates, and checks in one place.</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="max-w-xl text-muted">Teams that already use FoodTrace can watch the products they handle. This page only describes that work. It does not start a new inventory system.</p>
            </Reveal>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              ["Monitor inventory", "See the lots saved for a business profile."],
              ["Track product batches", "Store the lot and the expiration date beside the product."],
              ["Receive alerts", "Recall, expiration, and not-yet-checked items can surface as alerts."],
              ["Review evidence history", "Earlier checks remain available with their reports."],
            ].map(([title, body], index) => (
              <Reveal key={title} delay={index * 0.05}>
                <article className="h-full border-t border-pine/30 pt-4">
                  <p className="text-sm font-semibold text-lake">0{index + 1}</p>
                  <h3 className="mt-2 font-serif text-2xl">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Link href="/inventory" className="mt-8 inline-flex font-semibold text-pine">Open the existing inventory page</Link>
        </section>

        <section id="evidence" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">Trust & evidence</p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl">Every result should be traceable to what was checked.</h2>
              <p className="mt-3 max-w-2xl text-muted">The timeline is the shape of a report. It is not a promise that every public source was complete.</p>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {[
                ["Source checked", "The source name and address stay with the excerpt."],
                ["Evidence found", "The record text is kept, including when it is demo data."],
                ["Timestamp", "Retrieval time is stored with the evidence."],
                ["Verification result", "The status names the outcome and the criteria that fired."],
              ].map(([title, body], index) => (
                <Reveal key={title} delay={index * 0.08}>
                  <article>
                    <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-mist font-semibold text-pine">{index + 1}</span>
                    {index < 3 ? <span className="sr-only">Next: </span> : null}
                    <h3 className="font-serif text-2xl">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <div className="overflow-hidden rounded-[32px] bg-pine px-6 py-14 text-white sm:px-12">
              <h2 className="max-w-2xl font-serif text-4xl sm:text-5xl">Check your next product with more clarity.</h2>
              <p className="mt-4 max-w-xl text-white/80">Clarity means you can see the sources and the time of the check.</p>
              <Link href="/lookup" className="mt-8 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-pine transition hover:bg-mist">Check a Product</Link>
            </div>
          </Reveal>
          <aside className="mt-8 rounded-[24px] border border-line bg-card p-5 text-sm leading-6 text-muted">
            <p className="font-semibold text-ink">Safety disclaimer</p>
            <p className="mt-1">FoodTrace is an information and verification tool. It does not guarantee that food is safe and does not replace official food-safety guidance.</p>
          </aside>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
