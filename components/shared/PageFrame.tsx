export function PageFrame({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-pine">{kicker}</p>
      <h1 className="mt-2 font-serif text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-muted">{lede}</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "error" | "demo"; children: React.ReactNode }) {
  const styles = {
    neutral: "border-line bg-white text-ink",
    error: "border-recall/30 bg-recall-soft text-recall",
    demo: "border-amber/30 bg-amber-soft text-amber",
  };
  return <p className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}

export function RetryButton({ onClick, label = "Try again" }: { onClick: () => void; label?: string }) {
  return (
    <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" onClick={onClick}>
      {label}
    </button>
  );
}
