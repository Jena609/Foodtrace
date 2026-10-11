"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice, PageFrame, RetryButton } from "@/components/shared/PageFrame";
import { StatusMark } from "@/components/shared/StatusMark";
import type { VerdictStatus } from "@/lib/types";

interface HistoryItem {
  id: string;
  createdAt: string;
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  status: string;
  finalizationStatus: string;
  isMock: boolean;
  genlayerTransactionId: string;
  appealCount: number;
  reportHref: string;
  resultHref: string;
}

const known = new Set(["RECALL_FOUND", "NO_MATCHING_RECALL_FOUND", "EXPIRED", "CONFLICTING_INFORMATION", "UNABLE_TO_VERIFY"]);

export function HistoryView() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/history");
      const payload = (await response.json()) as { items?: HistoryItem[]; signedIn?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error || "History could not be loaded.");
      setItems(payload.items ?? []);
      setSignedIn(Boolean(payload.signedIn));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "History could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageFrame kicker="History" title="Verification history" lede="Checks saved on this browser stay with the local FoodTrace profile. Reopen a result, its report, or an appeal without changing the original record.">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="mt-4"><RetryButton onClick={() => void load()} /></div>
      {loading ? <div className="mt-6 h-40 animate-pulse rounded-3xl bg-white" /> : !signedIn || items.length === 0 ? (
        <div className="ft-card mt-6 p-6">
          <h2 className="font-serif text-2xl">No checks yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Run a product check in this browser. The result, report, transaction id, and any later appeal will appear here.</p>
          <Link className="mt-4 inline-block rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white" href="/lookup">Check a product</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="ft-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                {known.has(item.status) ? <StatusMark status={item.status as VerdictStatus} pending={item.finalizationStatus === "pending"} /> : <span>{item.status}</span>}
                {item.isMock ? <span className="text-xs font-semibold uppercase text-amber">Mock result</span> : null}
              </div>
              <h2 className="mt-3 font-serif text-2xl">{item.productName || item.brand || item.barcode || "Product check"}</h2>
              <p className="mt-1 text-sm text-muted">{new Date(item.createdAt).toLocaleString()} · {item.lotNumber || "No lot"} · {item.appealCount} appeal{item.appealCount === 1 ? "" : "s"}</p>
              {item.genlayerTransactionId ? <p className="mt-2 break-all font-mono text-xs">{item.genlayerTransactionId}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                <Link className="rounded-full bg-pine px-3 py-1 text-white" href={item.resultHref}>Open result</Link>
                <Link className="rounded-full border border-line px-3 py-1" href={item.reportHref}>Report</Link>
                <Link className="rounded-full border border-line px-3 py-1" href={`/appeal/${item.id}`}>Appeal</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
