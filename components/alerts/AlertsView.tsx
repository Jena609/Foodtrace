"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Notice, PageFrame, RetryButton } from "@/components/shared/PageFrame";
import { useSignedFetch } from "@/components/wallet/useSignedFetch";

interface AlertItem {
  itemId: string;
  productName: string;
  kind: string;
  title: string;
  detail: string;
}

export function AlertsView() {
  const signed = useSignedFetch();
  const { isConnected } = useAccount();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [demo, setDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDemo() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/alerts?demo=1");
      const payload = (await response.json()) as { alerts?: AlertItem[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Alerts could not be loaded.");
      setAlerts(payload.alerts ?? []);
      setDemo(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Alerts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMine() {
    setError(null);
    try {
      const payload = await signed.json<{ alerts: AlertItem[] }>("/api/alerts", "alerts.read", {}, "GET");
      setAlerts(payload.alerts);
      setDemo(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your alerts could not be loaded.");
    }
  }

  useEffect(() => {
    void loadDemo();
  }, []);

  return (
    <PageFrame kicker="Alerts" title="Recall and expiration alerts" lede="Alerts come from inventory checks and expiration dates. A result never means a product is certified safe.">
      {demo ? <Notice tone="demo">DEMO DATA. These alerts are from the fictional sample inventory.</Notice> : <Notice>These alerts belong to the business saved for the connected wallet.</Notice>}
      {error ? <div className="mt-4"><Notice tone="error">{error}</Notice></div> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={!isConnected} onClick={() => void loadMine()}>
          {isConnected ? "Load my alerts" : "Connect a wallet for your alerts"}
        </button>
        <RetryButton onClick={() => void loadDemo()} label="Show sample" />
        <Link className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" href="/inventory">Open inventory</Link>
      </div>
      {loading ? <div className="mt-6 h-32 animate-pulse rounded-3xl bg-white" /> : alerts.length === 0 ? (
        <div className="ft-card mt-6 p-6">
          <h2 className="font-serif text-2xl">No alerts</h2>
          <p className="mt-2 text-sm text-muted">Nothing in this list needs attention. Add lots and run checks to see recall, expiration, and unverified items here.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {alerts.map((alert) => (
            <li key={`${alert.itemId}-${alert.kind}`} className="ft-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{alert.title}</p>
              <h2 className="mt-1 font-serif text-2xl">{alert.productName}</h2>
              <p className="mt-2 text-sm leading-6">{alert.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </PageFrame>
  );
}
