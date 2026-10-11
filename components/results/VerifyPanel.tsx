"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { writeStudioContract } from "@/lib/genlayer/browser";
import { STUDIO_NEXT } from "@/lib/genlayer/config";
import type { LookupView } from "@/lib/lookup/view";
import { useSignedFetch } from "@/components/wallet/useSignedFetch";
import { Notice } from "@/components/shared/PageFrame";

const STOP = new Set(["finalized", "disputed", "inconclusive", "failed", "unavailable", "mock"]);

function isProvider(value: unknown): value is { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } {
  return Boolean(value && typeof value === "object" && "request" in value && typeof (value as { request?: unknown }).request === "function");
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function VerifyPanel({ lookup, onLookup }: { lookup: LookupView; onLookup: (lookup: LookupView) => void }) {
  const signed = useSignedFetch();
  const { address, chainId, connector, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txToRecord, setTxToRecord] = useState<string | null>(null);
  const [evaluationToRecord, setEvaluationToRecord] = useState<string | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    stopRef.current = false;
    return () => {
      stopRef.current = true;
    };
  }, [lookup.id]);

  async function refreshOnce() {
    const response = await fetch(`/api/genlayer/verification/${lookup.id}`);
    const payload = (await response.json()) as { lookup?: LookupView; error?: string; refresh?: { detail?: string; finalizationStatus?: string } };
    if (!response.ok || !payload.lookup) throw new Error(payload.error || "The verification status could not be read.");
    onLookup(payload.lookup);
    return payload;
  }

  async function poll() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (stopRef.current) return;
      const payload = await refreshOnce();
      const status = payload.lookup?.finalizationStatus ?? "";
      if (STOP.has(status)) {
        setMessage(payload.refresh?.detail || "Status check finished.");
        return;
      }
      setMessage(payload.refresh?.detail || "Waiting for this transaction. No finalized result has been applied.");
      await new Promise((resolve) => window.setTimeout(resolve, 5000));
    }
    setMessage("The transaction is still pending. No finalized result was applied. Check again when you are ready.");
  }

  async function record(evaluationId: string, transactionId: string) {
    await signed.json("/api/genlayer/verify", "genlayer.submit", {
      phase: "submitted",
      lookupId: lookup.id,
      evaluationId,
      transactionId,
    });
    setTxToRecord(null);
    setMessage("Transaction recorded. FoodTrace is checking this transaction only.");
    await poll();
  }

  async function submit() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (!isConnected || !address || !connector) throw new Error("Connect a wallet to submit a GenLayer verification.");
      if (chainId !== STUDIO_NEXT.chainId) {
        await switchChainAsync({ chainId: STUDIO_NEXT.chainId });
      }
      const prepared = await signed.json<{
        evaluationId: string;
        payloadJson: string;
        contractAddress: string;
        method: string;
      }>("/api/genlayer/verify", "genlayer.prepare", { phase: "prepare", lookupId: lookup.id });
      if (!isAddress(prepared.contractAddress)) throw new Error("The contract address from the server is not valid. Nothing was submitted.");
      const provider = await connector.getProvider();
      if (!isProvider(provider)) throw new Error("This wallet did not expose a provider. Nothing was submitted.");
      let hash: `0x${string}`;
      try {
        hash = await writeStudioContract({
          provider,
          account: address,
          contractAddress: prepared.contractAddress,
          method: prepared.method,
          args: [prepared.evaluationId, prepared.payloadJson],
        });
      } catch (caught) {
        throw new Error(caught instanceof Error ? caught.message : "The wallet did not submit a transaction. Nothing was marked finalized.");
      }
      setEvaluationToRecord(prepared.evaluationId);
      setTxToRecord(hash);
      await record(prepared.evaluationId, hash);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GenLayer verification failed. No finalized result was created.");
    } finally {
      setPending(false);
    }
  }

  const linked = Boolean(lookup.genlayerTransactionId);
  const finalized = lookup.finalizationStatus === "finalized" && !lookup.isMock;

  return (
    <section className="ft-card p-5" aria-labelledby="genlayer-heading">
      <h2 id="genlayer-heading" className="font-serif text-2xl">GenLayer verification</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{lookup.finalizationDetail}</p>
      {lookup.isMock ? <p className="mt-3"><Notice tone="demo">MOCK RESULT. This check used local demo evaluation. It is not a GenLayer-finalized result.</Notice></p> : null}
      {lookup.genlayerTransactionId ? <p className="mt-3 break-all font-mono text-xs">Transaction {lookup.genlayerTransactionId}</p> : null}
      {lookup.genlayerEvaluationId ? <p className="mt-1 break-all font-mono text-xs">Evaluation {lookup.genlayerEvaluationId}</p> : null}
      {finalized ? <p className="mt-3 text-sm font-semibold text-pine">This page is showing the evaluation created by the transaction above.</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={pending || finalized || linked} onClick={() => void submit()}>
          {pending ? "Waiting for wallet..." : "Submit for GenLayer verification"}
        </button>
        <button className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold" type="button" disabled={pending} onClick={() => void refreshOnce().then((payload) => setMessage(payload.refresh?.detail || "Status refreshed.")).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Refresh failed."))}>
          Check status
        </button>
        {txToRecord && evaluationToRecord ? (
          <button className="rounded-full border border-pine px-4 py-2 text-sm font-semibold text-pine" type="button" onClick={() => void record(evaluationToRecord, txToRecord).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "The transaction was not recorded."))}>
            Record transaction
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-3 text-sm text-muted" role="status">{message}</p> : null}
      {error ? <p className="mt-3"><Notice tone="error">{error}</Notice></p> : null}
    </section>
  );
}
