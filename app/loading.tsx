export default function Loading() {
  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-16" aria-busy="true" aria-live="polite">
      <div className="h-8 w-40 animate-pulse rounded-full bg-line" />
      <div className="mt-6 h-48 animate-pulse rounded-3xl bg-white" />
    </main>
  );
}
