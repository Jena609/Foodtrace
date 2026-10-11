"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-serif text-4xl">Something went wrong.</h1>
      <p className="mt-4 text-muted">{error.message || "The page could not be loaded."}</p>
      <button className="mt-6 rounded-full bg-pine px-5 py-3 font-semibold text-white" type="button" onClick={() => reset()}>Try again</button>
    </main>
  );
}
