import { CalendarClock, CircleHelp, Clock, FileSearch, Scale, ShieldAlert } from "lucide-react";
import { STATUS_COPY } from "@/lib/copy";
import type { VerdictStatus } from "@/lib/types";

const tones: Record<VerdictStatus, string> = {
  RECALL_FOUND: "bg-recall-soft text-recall",
  NO_MATCHING_RECALL_FOUND: "bg-lake-soft text-lake",
  EXPIRED: "bg-plum-soft text-plum",
  CONFLICTING_INFORMATION: "bg-amber-soft text-amber",
  UNABLE_TO_VERIFY: "bg-slate-soft text-slate",
};

const icons = {
  RECALL_FOUND: ShieldAlert,
  NO_MATCHING_RECALL_FOUND: FileSearch,
  EXPIRED: CalendarClock,
  CONFLICTING_INFORMATION: Scale,
  UNABLE_TO_VERIFY: CircleHelp,
};

export function StatusMark({ status, pending = false }: { status: VerdictStatus; pending?: boolean }) {
  const Icon = pending ? Clock : icons[status];
  const copy = STATUS_COPY[status];
  const tone = pending ? "bg-pending-soft text-pending" : tones[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{pending ? "Pending" : copy.label}</span>
    </span>
  );
}
