import { SAFETY_DISCLAIMER } from "@/lib/copy";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`rounded-2xl border border-line bg-white/80 text-sm leading-6 text-muted ${compact ? "p-4" : "p-5"}`}>
      <p className="font-semibold text-ink">Safety disclaimer</p>
      <p className="mt-1">{SAFETY_DISCLAIMER}</p>
    </aside>
  );
}
