"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { Notice, PageFrame, RetryButton } from "@/components/shared/PageFrame";
import { StatusMark } from "@/components/shared/StatusMark";
import { useSignedFetch } from "@/components/wallet/useSignedFetch";
import { writeStudioContract } from "@/lib/genlayer/browser";
import { STUDIO_NEXT } from "@/lib/genlayer/config";
import type { LookupView } from "@/lib/lookup/view";
import { cleanText } from "@/lib/security/sanitize";

const reasons = [
  ["incorrect_match", "Incorrect match"],
  ["new_evidence", "New evidence"],
  ["incorrect_lot", "Incorrect lot"],
  ["source_unavailable", "Source unavailable"],
  ["conflicting_official_sources", "Conflicting official sources"],
  ["later_manufacturer_notice", "Later manufacturer notice"],
] as const;

function isProvider(value: unknown): value is { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } {
  return Boolean(value && typeof value === "object" && "request" in value && typeof (value as { request?: unknown }).request === "function");
}

export function AppealForm({ id }: { id: string }) {
  const signed = useSignedFetch();
  const { address, chainId, connector, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [lookup, setLookup] = useState<LookupView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("new_evidence");
  const [url, setUrl] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/lookup/${id}`);
      const payload = (await response.json()) as { lookup?: LookupView; error?: string };
      if (!response.ok || !payload.lookup) throw new Error(payload.error || "That result was not found.");
      setLookup(payload.lookup);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That result could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const body = {
      lookupId: id,
      reason,
      newEvidenceUrl: cleanText(url, 400),
      explanation: cleanText(explanation, 2000),
    };
    try {
      const created = await signed.json<{
        mock?: boolean;
        appeal?: { id: string; outcomeSummary?: string };
        contractAddress?: string;
        method?: string;
        args?: unknown[];
        originalStatus?: string;
      }>("/api/appeals", "appeal.create", body);
      if (created.mock) {
        setNotice(created.appeal?.outcomeSummary || "The appeal was recorded locally. The original result was preserved. MOCK RESULT.");
        await load();
        return;
      }
      if (!created.contractAddress || !created.method || !created.args || !created.appeal || !isConnected || !address || !connector) {
        throw new Error("GenLayer did not return an appeal transaction. The original result was preserved.");
      }
      if (chainId !== STUDIO_NEXT.chainId) await switchChainAsync({ chainId: STUDIO_NEXT.chainId });
      const provider = await connector.getProvider();
      if (!isProvider(provider) || !/^0x[0-9a-fA-F]{40}$/.test(created.contractAddress)) {
        throw new Error("The wallet could not submit the appeal. The original result was preserved.");
      }
      const hash = await writeStudioContract({
        provider,
        account: address,
        contractAddress: created.contractAddress as `0x${string}`,
        method: created.method,
        args: created.args,
      });
      await signed.json("/api/appeals", "appeal.submit", { phase: "submitted", appealId: created.appeal.id, transactionId: hash });
      setNotice(`Appeal transaction ${hash} was recorded. The original result was not overwritten. The appeal stays pending until its own transaction is finalized.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The appeal was not submitted.");
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <PageFrame kicker="Appeal" title="Loading the original result" lede="An appeal is added beside the original result."><div className="h-40 animate-pulse rounded-3xl bg-white" /></PageFrame>;
  }
  if (error && !lookup) {
    return <PageFrame kicker="Appeal" title="Appeal unavailable" lede="The original result could not be opened."><Notice tone="error">{error}</Notice><div className="mt-4"><RetryButton onClick={() => void load()} /></div></PageFrame>;
  }
  if (!lookup) return null;

  return (
    <PageFrame kicker="Appeal" title="Appeal this verification" lede="The original result stays in history. An appeal adds a new record. It does not replace the earlier one.">
      <section className="ft-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusMark status={lookup.status} pending={lookup.finalizationStatus === "pending"} />
          <span className="text-sm text-muted">Original result</span>
        </div>
        <p className="mt-3">{lookup.reasoningSummary}</p>
        <Link className="mt-3 inline-block text-sm font-semibold text-lake" href={`/results/${lookup.id}`}>Back to the result</Link>
      </section>

      <form className="ft-card mt-4 grid gap-4 p-5" onSubmit={(event) => void submit(event)}>
        <label className="text-sm font-semibold">Reason
          <select className="ft-select mt-1" value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>
            {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">New evidence URL
          <input className="ft-input mt-1" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" inputMode="url" />
        </label>
        <label className="text-sm font-semibold">Explanation
          <textarea className="ft-textarea mt-1 min-h-32" value={explanation} onChange={(event) => setExplanation(event.target.value)} required minLength={12} />
        </label>
        <button className="w-fit rounded-full bg-pine px-5 py-3 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Submitting..." : "Submit appeal"}
        </button>
        <p className="text-sm text-muted">A wallet signature is required. In mock mode the appeal is stored locally and labeled MOCK RESULT. In studio mode a public https URL is required, and the appeal is pending until that transaction finalizes.</p>
      </form>
      {notice ? <div className="mt-4"><Notice>{notice}</Notice></div> : null}
      {error ? <div className="mt-4"><Notice tone="error">{error}</Notice><div className="mt-3"><RetryButton onClick={() => setError(null)} label="Dismiss" /></div></div> : null}

      <section className="mt-6">
        <h2 className="font-serif text-2xl">Appeal history</h2>
        {lookup.appeals.length === 0 ? <p className="mt-2 text-sm text-muted">No appeals yet.</p> : null}
        <ul className="mt-3 grid gap-3">
          {lookup.appeals.map((appeal) => (
            <li key={appeal.id} className="ft-card p-4 text-sm">
              <p className="font-semibold">{appeal.reason.replaceAll("_", " ")} · {appeal.status}{appeal.isMock ? " · MOCK RESULT" : ""}</p>
              <p className="mt-1">{appeal.explanation}</p>
              <p className="mt-1 text-muted">{appeal.outcomeSummary || "No outcome has replaced the original result."}</p>
              {appeal.genlayerTransactionId ? <p className="mt-1 break-all font-mono text-xs">Transaction {appeal.genlayerTransactionId}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </PageFrame>
  );
}
