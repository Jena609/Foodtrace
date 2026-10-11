"use client";

import { useState } from "react";

export function ReportActions({ reportId }: { reportId: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/report/${reportId}`;
    try {
      if (navigator.share) await navigator.share({ title: "FoodTrace report", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => window.print()}>Print report</button>
      <a className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" href={`/api/reports/${reportId}`}>JSON export</a>
      <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" onClick={() => void share()}>{copied ? "Link copied" : "Share report"}</button>
    </div>
  );
}
