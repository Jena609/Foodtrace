import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-20">
      <p className="text-sm font-semibold uppercase tracking-wide text-pine">404</p>
      <h1 className="mt-2 font-serif text-4xl">That page is not in FoodTrace.</h1>
      <p className="mt-4 text-muted">The link may be old, or the result id may not exist in this database.</p>
      <Link href="/lookup" className="mt-6 inline-flex rounded-full bg-pine px-5 py-3 font-semibold text-white">Check a product</Link>
    </main>
  );
}
