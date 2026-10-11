import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "For businesses",
  description: "How a business can watch lots and checks already saved in FoodTrace.",
};

const items = [
  ["Monitor inventory", "See the lots saved for a business profile."],
  ["Track product batches", "Store the lot and the expiration date beside the product."],
  ["Receive alerts", "Recall, expiration, and not-yet-checked items can surface as alerts."],
  ["Review evidence history", "Earlier checks remain available with their reports."],
];

export default function ForBusinessesPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-pine">For businesses</p>
      <h1 className="mt-3 font-serif text-4xl">Keep lots, dates, and checks in one place.</h1>
      <p className="mt-4 text-muted">Teams that already use FoodTrace can watch the products they handle. This page only describes that work.</p>
      <ul className="mt-8 grid gap-4">
        {items.map(([title, body], index) => (
          <li key={title} className="border-t border-pine/30 pt-4">
            <p className="text-sm font-semibold text-lake">0{index + 1}</p>
            <h2 className="mt-2 font-serif text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </li>
        ))}
      </ul>
      <Link href="/inventory" className="mt-8 inline-flex font-semibold text-pine">Open inventory</Link>
    </main>
  );
}
