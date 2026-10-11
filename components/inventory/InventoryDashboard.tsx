"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Notice, PageFrame, RetryButton } from "@/components/shared/PageFrame";
import { useSignedFetch } from "@/components/wallet/useSignedFetch";

interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  supplier: string;
  status: string;
  lastCheckedAt: string | null;
  lastLookupId: string;
  demo?: boolean;
}

interface Summary {
  business: { id: string; name: string; region: string } | null;
  items: InventoryItem[];
  counts: { active: number; recalls: number; expiring: number; expired: number; unverified: number };
  alerts: Array<{ itemId: string; title: string; detail: string }>;
}

const labels: Record<string, string> = {
  unverified: "Not checked",
  recall_found: "Recall alert",
  no_matching_recall: "No matching recall",
  expired: "Expired",
  conflicting: "Conflicting information",
  unable_to_verify: "Unable to verify",
  expiring_soon: "Expiring soon",
};

export function InventoryDashboard() {
  const signed = useSignedFetch();
  const { isConnected } = useAccount();
  const [demo, setDemo] = useState<Summary | null>(null);
  const [mine, setMine] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function loadDemo() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/inventory?demo=1");
      const payload = (await response.json()) as { items?: InventoryItem[]; business?: Summary["business"]; alerts?: Summary["alerts"]; error?: string };
      if (!response.ok) throw new Error(payload.error || "The sample inventory could not be loaded.");
      const items = payload.items ?? [];
      setDemo({
        business: payload.business ?? null,
        items,
        alerts: payload.alerts ?? [],
        counts: {
          active: items.length,
          recalls: items.filter((item) => item.status === "recall_found").length,
          expiring: items.filter((item) => item.status === "expiring_soon").length,
          expired: items.filter((item) => item.status === "expired").length,
          unverified: items.filter((item) => item.status === "unverified" || item.status === "unable_to_verify").length,
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The sample inventory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMine() {
    setError(null);
    try {
      const payload = await signed.json<{ summary: Summary | null }>("/api/inventory", "inventory.read", {}, "GET");
      if (!payload.summary) {
        setMine(null);
        setError("No business profile is saved for this wallet yet. Add one, then load inventory again.");
        return;
      }
      setMine(payload.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your inventory could not be loaded.");
    }
  }

  useEffect(() => {
    void loadDemo();
  }, []);

  const view = mine ?? demo;
  const showingDemo = !mine;

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await signed.json(`/api/inventory/${id}`, "inventory.delete", { id }, "DELETE");
      setConfirmId(null);
      await loadMine();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The item was not removed.");
    } finally {
      setBusyId(null);
    }
  }

  async function check(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const payload = await signed.json<{ lookupId: string }>(`/api/inventory/${id}/check`, "inventory.check", { id });
      window.location.href = `/results/${payload.lookupId}`;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The check did not start.");
      setBusyId(null);
    }
  }

  async function exportCsv() {
    setError(null);
    try {
      const response = await signed.raw("/api/inventory?format=csv", "inventory.read", {}, "GET");
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "The export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "foodtrace-inventory.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The export failed.");
    }
  }

  return (
    <PageFrame kicker="Business inventory" title="Monitor lots you handle" lede="Connect a wallet to save a business profile, add lots, and run the same checks a shopper uses. The sample below is fictional.">
      {showingDemo ? <Notice tone="demo">DEMO DATA. These rows are not stored against your wallet.</Notice> : <Notice>Showing inventory for {mine?.business?.name}. Supplier and quantity stay off public reports.</Notice>}
      {error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white" href="/inventory/add">Add inventory</Link>
        <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" disabled={!isConnected} onClick={() => void loadMine()}>
          {isConnected ? "Load my inventory" : "Connect a wallet to load inventory"}
        </button>
        <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" disabled={!mine} onClick={() => void exportCsv()}>Export CSV</button>
        <RetryButton onClick={() => void loadDemo()} label="Reload sample" />
      </div>
      {loading || !view ? <div className="mt-6 h-40 animate-pulse rounded-3xl bg-white" aria-busy="true" /> : (
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Active products", view.counts.active],
              ["Recall alerts", view.counts.recalls],
              ["Expiring soon", view.counts.expiring],
              ["Expired", view.counts.expired],
              ["Unverified", view.counts.unverified],
            ].map(([label, value]) => (
              <div key={String(label)} className="ft-card p-4">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1 font-serif text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">Inventory items</caption>
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 font-semibold">Lot</th>
                  <th className="py-2 pr-3 font-semibold">Expires</th>
                  <th className="py-2 pr-3 font-semibold">Qty</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {view.items.length === 0 ? <tr><td className="py-6 text-muted" colSpan={6}>No products yet. Add a lot to start monitoring it.</td></tr> : null}
                {view.items.map((item) => (
                  <tr key={item.id} className="border-b border-line align-top">
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-muted">{item.brand}{item.demo ? " · demo" : ""}</p>
                    </td>
                    <td className="py-3 pr-3">{item.lotNumber || "Not provided"}</td>
                    <td className="py-3 pr-3">{item.expirationDate || "Not provided"}</td>
                    <td className="py-3 pr-3">{item.quantity}</td>
                    <td className="py-3 pr-3">{labels[item.status] ?? item.status}</td>
                    <td className="py-3">
                      {showingDemo ? <span className="text-muted">Sample only</span> : (
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-full border border-line px-3 py-1" type="button" disabled={busyId === item.id} onClick={() => void check(item.id)}>Check</button>
                          {item.lastLookupId ? <Link className="rounded-full border border-line px-3 py-1" href={`/results/${item.lastLookupId}`}>Result</Link> : null}
                          <button className="rounded-full border border-recall px-3 py-1 text-recall" type="button" onClick={() => setConfirmId(item.id)}>Remove</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {confirmId ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" role="presentation">
          <div className="w-full max-w-md rounded-3xl bg-card p-6" role="dialog" aria-modal="true" aria-labelledby="remove-title">
            <h2 id="remove-title" className="font-serif text-2xl">Remove this lot?</h2>
            <p className="mt-2 text-sm text-muted">The product leaves this business inventory. Earlier verification reports stay available.</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-full bg-recall px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => void remove(confirmId)}>Remove</button>
              <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold" type="button" onClick={() => setConfirmId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
