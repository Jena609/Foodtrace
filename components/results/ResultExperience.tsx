"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Disclaimer } from "@/components/shared/Disclaimer";
import { Notice, PageFrame, RetryButton } from "@/components/shared/PageFrame";
import { StatusMark } from "@/components/shared/StatusMark";
import { VerifyPanel } from "@/components/results/VerifyPanel";
import { FINALIZATION_COPY, STATUS_COPY } from "@/lib/copy";
import type { LookupView } from "@/lib/lookup/view";

async function readVerification(id: string, setLookup: (lookup: LookupView) => void, setError: (value: string | null) => void) {
  setError(null);
  const response = await fetch(`/api/genlayer/verification/${id}`);
  const payload = (await response.json()) as { lookup?: LookupView; error?: string };
  if (!response.ok || !payload.lookup) {
    setError(payload.error || "GenLayer verification status could not be refreshed.");
    return;
  }
  setLookup(payload.lookup);
}

async function retryGenLayer(id: string, setLookup: (lookup: LookupView) => void, setError: (value: string | null) => void) {
  setError(null);
  const response = await fetch(`/api/genlayer/submit/${id}`, { method: "POST" });
  const payload = (await response.json()) as { lookup?: LookupView; error?: string };
  if (!response.ok || !payload.lookup) {
    setError(payload.error || "GenLayer verification could not be retried.");
    return;
  }
  setLookup(payload.lookup);
}

function copyVerification(lookup: LookupView, setCopied: (value: boolean) => void) {
  const lines = [
    "FoodTrace Verification",
    `Status: ${lookup.reviewStatus}`,
    `Classification: ${lookup.classification}`,
    `Contract verdict: ${lookup.status}`,
    `Data: ${lookup.dataStatus}`,
    `GenLayer Network: ${lookup.genlayerNetwork || "Not available"}`,
    `Contract: ${lookup.contractAddress || "Not available"}`,
    `Request / Transaction: ${lookup.genlayerTransactionId || lookup.genlayerEvaluationId || "Not available"}`,
    `Evaluation Time: ${lookup.evaluatedAt || "Not available"}`,
    `Evidence Sources: ${lookup.evidence.map((item) => item.sourceName).join(", ") || "Not available"}`,
    `Source Agreement: ${lookup.sourceAgreement}`,
    lookup.classificationSource === "genlayer" ? "GenLayer finalized this evaluation." : "FoodTrace evidence rules produced this classification. GenLayer did not finalize it.",
    lookup.disclaimer,
  ];
  navigator.clipboard.writeText(lines.join("\n")).then(() => setCopied(true)).catch(() => setCopied(false));
}

function field(label: string, value: string) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words">{value || "Not provided"}</dd>
    </div>
  );
}

export function ResultExperience({ id }: { id: string }) {
  const reduce = useReducedMotion();
  const [lookup, setLookup] = useState<LookupView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
    // The result id is the only input for this load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!lookup || lookup.reviewStatus !== "PENDING") return;
    let stopped = false;
    let attempts = 0;
    async function tick() {
      if (stopped || attempts >= 360) return;
      attempts += 1;
      try {
        const response = await fetch(`/api/genlayer/verification/${id}`);
        const payload = (await response.json()) as { lookup?: LookupView };
        if (!stopped && response.ok && payload.lookup) setLookup(payload.lookup);
      } catch {
        // A temporary network failure is retried on the next poll.
      }
    }
    void tick();
    const timer = window.setInterval(() => {
      if (attempts >= 360) {
        window.clearInterval(timer);
        return;
      }
      void tick();
    }, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
    // Restart only when this result starts or stops waiting on a transaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, lookup?.reviewStatus]);

  if (loading) {
    return (
      <PageFrame kicker="Result" title="Loading result" lede="Reading the saved check and its evidence.">
        <div className="grid gap-4" aria-busy="true" aria-live="polite">
          <div className="h-28 animate-pulse rounded-3xl bg-white" />
          <div className="h-48 animate-pulse rounded-3xl bg-white" />
        </div>
      </PageFrame>
    );
  }

  if (error || !lookup) {
    return (
      <PageFrame kicker="Result" title="Result unavailable" lede="This check could not be opened.">
        <Notice tone="error">{error || "That result was not found."}</Notice>
        <div className="mt-4 flex gap-2">
          <RetryButton onClick={() => void load()} />
          <Link className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white" href="/lookup">New check</Link>
        </div>
      </PageFrame>
    );
  }

  const finalized = lookup.reviewStatus === "FINALIZED";
  const waiting = lookup.reviewStatus === "PENDING";
  const copy = STATUS_COPY[lookup.status];
  const sourcesDisagree = lookup.evidence.some((item) => item.matched && item.recordKind === "recall") && lookup.evidence.some((item) => item.matched && item.recordKind === "clearance");
  const governmentSkipped = lookup.sourcesChecked.some((source) => source.skipped && /government/i.test(source.name));
  const shareUrl = `${window.location.origin}/report/${lookup.id}`;

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "FoodTrace report", url: shareUrl });
      else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      }
    } catch {
      setCopied(false);
    }
  }

  return (
    <PageFrame kicker="Verification result" title={lookup.input.productName || lookup.input.brand || "Product check"} lede={finalized ? copy.explanation : FINALIZATION_COPY[lookup.finalizationStatus]}>
      {lookup.dataStatus !== "Live Data" ? <div className="mb-4"><Notice tone="demo">Fictional Demo Data — not an official recall notice</Notice></div> : null}
      <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex flex-wrap items-center gap-3">
          {waiting ? <StatusMark status={lookup.status} pending /> : finalized ? <StatusMark status={lookup.status} /> : (
            <span className="inline-flex items-center rounded-full bg-pending-soft px-3 py-1 text-sm font-semibold text-pending">{lookup.reviewStatus === "FAILED" ? "Failed" : "Unavailable"}</span>
          )}
          {finalized ? <span className="text-sm text-muted">Confidence: {lookup.confidence}</span> : null}
          {lookup.isMock ? <span className="rounded-full bg-amber-soft px-3 py-1 text-sm font-semibold text-amber">MOCK RESULT</span> : null}
        </div>
        {finalized ? <p className="mt-4 max-w-3xl text-lg leading-8">{lookup.reasoningSummary}</p> : null}
        <p className="mt-2 text-sm text-muted">{FINALIZATION_COPY[lookup.finalizationStatus]}</p>
      </motion.div>

      <section className="ft-card mt-6 p-5" aria-labelledby="verification-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="verification-heading" className="font-serif text-2xl">FoodTrace Verification</h2>
          <span className="rounded-full bg-amber-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber">{lookup.dataStatus}</span>
        </div>
        <div className="mt-4 text-sm leading-6">
          {waiting ? (
            <>
              <p className="font-semibold">GenLayer Verification: Pending</p>
              <p>The evidence evaluation is still being processed.</p>
            </>
          ) : null}
          {finalized ? (
            <>
              <p className="font-semibold">GenLayer Verification: Finalized</p>
              <p>The result was finalized by GenLayer.</p>
            </>
          ) : null}
          {lookup.reviewStatus === "FAILED" ? (
            <>
              <p className="font-semibold">GenLayer Verification: Failed</p>
              <p>The evidence could not be finalized.</p>
              <p>Reason: {lookup.lastError || "GenLayer did not return a finalized result."}</p>
            </>
          ) : null}
          {lookup.reviewStatus === "UNAVAILABLE" ? (
            <>
              <p className="font-semibold">GenLayer Verification: Unavailable</p>
              <p>The result could not be finalized by GenLayer. Please retry later.</p>
              {lookup.lastError ? <p>Reason: {lookup.lastError}</p> : null}
            </>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {field("GenLayer verification", lookup.reviewStatus)}
          {field("Classification", finalized ? lookup.classification : "Pending")}
          {field("Confidence", finalized ? lookup.confidence : "Not available")}
          {field("Contract verdict", finalized ? lookup.status : "Not available")}
          {field("Network", lookup.genlayerNetwork || "Not available")}
          {field("Chain ID", lookup.genlayerChainId ? String(lookup.genlayerChainId) : "Not available")}
          {field("Contract Address", lookup.contractAddress || "Not available")}
          {field("Evaluation ID", lookup.genlayerEvaluationId || "Not available")}
          {field("Transaction ID", lookup.genlayerTransactionId || "Not available")}
          {field("Evidence Hash", lookup.evidenceHash || "Not available")}
          {field("Evaluated At", finalized ? new Date(lookup.evaluatedAt).toLocaleString() : "Not available")}
          {field("Source agreement", sourcesDisagree ? "Sources conflict" : lookup.sourceAgreement)}
        </dl>
        <p className="mt-4 text-sm leading-6 text-muted">{lookup.finalizationDetail}</p>
        {sourcesDisagree ? <p className="mt-3 text-sm font-semibold text-amber">Conflicting sources. The retrieved evidence does not agree, and both excerpts stay visible.{finalized && lookup.status !== "CONFLICTING_INFORMATION" ? ` GenLayer stored ${lookup.status}. FoodTrace still labels this check CONFLICTING_SOURCES.` : ""}</p> : null}
        {governmentSkipped ? <p className="mt-2 text-sm text-muted">Live government source: Not configured</p> : null}
        <ul className="mt-3 grid gap-1 text-sm">
          {lookup.evidence.length === 0 ? <li>Evidence sources: Not available</li> : lookup.evidence.map((item) => (
            <li key={`${item.id}-source`}>{item.sourceName} · {item.matched ? "matched" : "retrieved"} · {item.demo ? "Fictional Demo Data" : "Configured source"}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" onClick={() => void copyVerification(lookup, setCopied)}>
            {copied ? "Verification details copied" : "Copy Verification Details"}
          </button>
          {lookup.contractUrl ? <a className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" href={lookup.contractUrl} rel="noreferrer">Contract</a> : null}
          {lookup.transactionUrl ? <a className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" href={lookup.transactionUrl} rel="noreferrer">View on GenLayer Explorer</a> : null}
          {waiting ? (
            <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" onClick={() => void readVerification(id, setLookup, setError)}>Refresh verification</button>
          ) : null}
          {lookup.reviewStatus === "UNAVAILABLE" || lookup.reviewStatus === "FAILED" ? (
            <button className="rounded-full border border-recall px-4 py-2 text-sm font-semibold text-recall" type="button" onClick={() => void retryGenLayer(id, setLookup, setError)}>Retry Verification</button>
          ) : null}
        </div>
      </section>

      <section className="ft-card mt-6 p-5">
        <h2 className="font-serif text-2xl">Product</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {field("Brand", lookup.input.brand)}
          {field("Barcode", lookup.input.barcode)}
          {field("Lot / batch", lookup.input.lotNumber)}
          {field("Expiration", lookup.input.expirationDate)}
          {field("Region", lookup.input.region)}
          {field("Checked", new Date(lookup.evaluatedAt).toLocaleString())}
        </dl>
      </section>

      <section className="ft-card mt-4 p-5">
        <h2 className="font-serif text-2xl">Why this result</h2>
        <p className="mt-2 text-sm text-muted">Criteria are the deterministic rules that fired. A missing lot is never treated as proof of safety.</p>
        {lookup.matchedCriteria.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {lookup.matchedCriteria.map((item) => <li key={item} className="rounded-full bg-mist px-3 py-1 text-sm">{item.replaceAll("_", " ")}</li>)}
          </ul>
        ) : <p className="mt-3 text-sm">No match criteria fired.</p>}
        <p className="mt-4 break-all font-mono text-xs text-muted">Evidence hash {lookup.evidenceHash}</p>
      </section>

      <section className="mt-4 grid gap-4">
        <h2 className="font-serif text-2xl">Sources and excerpts</h2>
        {lookup.evidence.length === 0 ? <Notice>No source returned a record for this search.</Notice> : null}
        {lookup.evidence.map((item) => (
          <article key={item.id} className="ft-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{item.sourceName}</h3>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{item.demo ? "Fictional Demo Data" : "Live Data"} · {item.matched ? "Matched" : "Retrieved"} · priority {item.sourcePriority}</span>
            </div>
            <p className="mt-1 text-sm text-muted">Retrieved {new Date(item.retrievedAt).toLocaleString()} · {item.matched ? "Used in the match" : "Retrieved, not the deciding match"}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.evidenceText}</p>
            <a className="mt-3 inline-block text-sm font-semibold text-lake" href={item.sourceUrl} rel="noreferrer">{item.sourceUrl}</a>
          </article>
        ))}
      </section>

      <section className="ft-card mt-4 p-5">
        <h2 className="font-serif text-2xl">Sources checked</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {lookup.sourcesChecked.map((source) => (
            <li key={source.name}>
              {source.name} · {source.skipped ? "Skipped, not configured" : source.ok ? "Responded" : "Failed"}
              {source.demo ? " · demo" : ""}
              {source.error ? ` · ${source.error}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <VerifyPanel lookup={lookup} onLookup={setLookup} />
      </div>

      <section className="mt-4 flex flex-wrap gap-2">
        <Link className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white" href={`/report/${lookup.id}`}>Open report</Link>
        <a className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" href={`/api/reports/${lookup.id}`}>Download JSON</a>
        <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" onClick={() => void share()}>{copied ? "Link copied" : "Share report"}</button>
        <Link className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" href={`/appeal/${lookup.id}`}>Appeal this result</Link>
      </section>

      {lookup.appeals.length ? (
        <section className="mt-6">
          <h2 className="font-serif text-2xl">Appeals</h2>
          <ul className="mt-3 grid gap-3">
            {lookup.appeals.map((appeal) => (
              <li key={appeal.id} className="ft-card p-4 text-sm">
                <p className="font-semibold">{appeal.reason.replaceAll("_", " ")} · {appeal.status}{appeal.isMock ? " · MOCK RESULT" : ""}</p>
                <p className="mt-1 text-muted">{appeal.outcomeSummary || appeal.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6"><Disclaimer /></div>
    </PageFrame>
  );
}
