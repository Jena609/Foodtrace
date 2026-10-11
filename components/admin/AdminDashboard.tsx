"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice, PageFrame } from "@/components/shared/PageFrame";

interface Summary {
  totals: { users: number; businesses: number; appeals: number; recentLookups: number };
  recentStatusCounts: Record<string, number>;
  lookups: Array<{ id: string; productName: string; brand: string; status: string; createdAt: string; finalizationStatus: string; isMock: boolean; genlayerTransactionId: string }>;
  config: { genlayerMode: string; studioConfigured: boolean };
}

export function AdminDashboard() {
  const [token, setToken] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const session = await fetch("/api/admin/session");
    const sessionPayload = (await session.json()) as { signedIn?: boolean };
    setSignedIn(Boolean(sessionPayload.signedIn));
    if (!sessionPayload.signedIn) {
      setSummary(null);
      setLoading(false);
      return;
    }
    const response = await fetch("/api/admin/summary");
    const payload = (await response.json()) as Summary & { error?: string };
    if (!response.ok) throw new Error(payload.error || "The admin summary could not be loaded.");
    setSummary(payload);
    setLoading(false);
  }

  useEffect(() => {
    void refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "The admin dashboard could not be loaded.");
      setLoading(false);
    });
  }, []);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Admin sign-in failed.");
      return;
    }
    setToken("");
    await refresh();
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setSignedIn(false);
    setSummary(null);
  }

  return (
    <PageFrame kicker="Admin" title="Operations" lede="Recent checks and counts. This view does not show emails, wallet keys, or inventory quantities.">
      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? <div className="mt-4 h-24 animate-pulse rounded-3xl bg-white" /> : null}
      {!loading && !signedIn ? (
        <form className="ft-card mt-4 grid max-w-md gap-4 p-5" onSubmit={(event) => void signIn(event)}>
          <label className="text-sm font-semibold">Admin token
            <input className="ft-input mt-1" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" minLength={8} required />
          </label>
          <button className="w-fit rounded-full bg-pine px-5 py-3 font-semibold text-white" type="submit">Sign in</button>
          <p className="text-sm text-muted">The dashboard stays closed until FOODTRACE_ADMIN_TOKEN is set on the server.</p>
        </form>
      ) : null}
      {summary ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">GenLayer mode {summary.config.genlayerMode}. Studio configured: {summary.config.studioConfigured ? "yes" : "no"}.</p>
            <button className="rounded-full border border-line px-4 py-2 text-sm font-semibold" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            {Object.entries(summary.totals).map(([key, value]) => (
              <div key={key} className="ft-card p-4">
                <dt className="text-sm capitalize text-muted">{key.replace(/([A-Z])/g, " $1")}</dt>
                <dd className="font-serif text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-6 grid gap-3">
            {summary.lookups.length === 0 ? <li className="ft-card p-5 text-sm text-muted">No lookups have been saved.</li> : null}
            {summary.lookups.map((lookup) => (
              <li key={lookup.id} className="ft-card p-4 text-sm">
                <p className="font-semibold">{lookup.productName || lookup.brand || lookup.id}</p>
                <p className="text-muted">{lookup.status} · {lookup.finalizationStatus}{lookup.isMock ? " · mock" : ""} · {new Date(lookup.createdAt).toLocaleString()}</p>
                <Link className="mt-2 inline-block font-semibold text-lake" href={`/results/${lookup.id}`}>Open result</Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">Recent status counts: {Object.entries(summary.recentStatusCounts).map(([key, value]) => `${key} ${value}`).join(", ") || "none"}.</p>
        </div>
      ) : null}
    </PageFrame>
  );
}
