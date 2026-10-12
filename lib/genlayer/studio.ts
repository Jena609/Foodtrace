import type { Prisma } from "@prisma/client";
import { isAddress, type Address } from "viem";
import { prisma } from "@/lib/db/client";
import { isFetchablePublicUrl } from "@/lib/security/url";
import { UNAVAILABLE_MESSAGE, resolveGenLayerConfig } from "@/lib/genlayer/config";
import { CONSENSUS_TIMEOUT_MS, FINALIZATION_TIMEOUT_MS, isTransactionHash, mapTransactionObservation, statusAfterWait } from "@/lib/genlayer/observation";
import { VERDICT_STATUSES, type VerdictStatus } from "@/lib/types";

interface ChainRecord {
  request_id?: string;
  appeal_id?: string;
  status?: string;
  confidence?: string;
  reasoningSummary?: string;
  matchedCriteria?: string[];
  evidenceHash?: string;
  evaluatedAt?: string;
}

export function studioPayload(input: {
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  expirationDate: string;
  region: string;
  evidenceUrls: string[];
  evidenceHash: string;
  requestTimestamp: string;
}) {
  return JSON.stringify({
    policy: "foodtrace-v1",
    product_name: input.productName,
    brand: input.brand,
    barcode: input.barcode,
    lot_number: input.lotNumber,
    expiration_date: input.expirationDate,
    region: input.region,
    evidence_urls: input.evidenceUrls,
    evidence_hash: input.evidenceHash,
    request_timestamp: input.requestTimestamp,
  });
}

export function publicEvidenceUrls(urls: string[], appUrl: string): string[] {
  const own = appUrl.trim().replace(/\/$/, "");
  const allowed = urls.filter((url) => {
    if (!isFetchablePublicUrl(url)) return false;
    if (own.startsWith("http://") && url.startsWith(own)) return false;
    return true;
  });
  return [...new Set(allowed)].slice(0, 6);
}

const EXPLORER_STATUSES = new Set(["PENDING", "PROPOSING", "COMMITTING", "REVEALING", "ACCEPTED", "FINALIZED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT", "UNDETERMINED"]);

function unwrapTransaction(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (typeof record.statusName === "string" || typeof record.status_name === "string") return record;
  if (typeof record.status === "string" && EXPLORER_STATUSES.has(record.status)) return record;
  if (record.transaction && typeof record.transaction === "object") return unwrapTransaction(record.transaction);
  if (record.data && typeof record.data === "object") return unwrapTransaction(record.data);
  if (record.result && typeof record.result === "object") return unwrapTransaction(record.result);
  return record;
}

async function fetchStudioTransactionOnce(hash: string): Promise<unknown | null> {
  const config = resolveGenLayerConfig(process.env);
  if (!config.rpcUrl || !isTransactionHash(hash)) return null;
  try {
    const response = await fetch(`${config.explorerUrl}/api/transactions/${hash}`, { headers: { accept: "application/json" } });
    if (response.ok) return unwrapTransaction(await response.json());
  } catch {
    // The explorer can be unreachable. The RPC observation below is the next attempt.
  }
  try {
    const response = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash] }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: unknown };
    return unwrapTransaction(payload.result ?? payload);
  } catch {
    return null;
  }
}

export async function fetchStudioTransaction(hash: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = await fetchStudioTransactionOnce(hash);
    if (observed) return observed;
  }
  return null;
}

export function safeGenLayerError(error: unknown): string {
  const message = error instanceof Error ? error.message : "GenLayer verification failed.";
  return message.replace(/0x[0-9a-fA-F]{64}/g, "0x…").slice(0, 300);
}

function asRecord(value: unknown): ChainRecord | null {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value) as unknown);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  return value as ChainRecord;
}

export async function readContractResult(method: "get_verification_result" | "get_evidence_history" | "finalize_verification", evaluationId: string): Promise<ChainRecord | null> {
  const config = resolveGenLayerConfig(process.env);
  if (!config.studioReady || !isAddress(config.contractAddress)) return null;
  const { createStudioClient } = await import("@/lib/genlayer/sdk");
  const client = await createStudioClient();
  const value = await client.readContract({
    address: config.contractAddress as Address,
    functionName: method,
    args: [evaluationId],
  });
  return asRecord(value);
}

function isVerdict(value: string | undefined): value is VerdictStatus {
  return VERDICT_STATUSES.includes(value as VerdictStatus);
}

export async function prepareVerification(lookupId: string) {
  const config = resolveGenLayerConfig(process.env);
  if (config.mode !== "studio") {
    return { ok: false as const, status: 409, error: "GenLayer studio mode is not selected. The current result stays a labeled mock and was not sent to GenLayer." };
  }
  if (!config.studioReady) {
    return { ok: false as const, status: 503, error: UNAVAILABLE_MESSAGE };
  }
  const lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true, evidence: true } });
  if (!lookup?.result) return { ok: false as const, status: 404, error: "That lookup was not found." };
  if (lookup.result.finalizationStatus === "finalized") {
    return { ok: false as const, status: 409, error: "This lookup already has a finalized GenLayer result. Submit an appeal to add evidence." };
  }
  if (lookup.result.genlayerTransactionId) {
    return { ok: false as const, status: 409, error: "A transaction is already linked to this lookup. Refresh its status instead of submitting another one." };
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const hosted = lookup.evidence.map((item) => `${appUrl.replace(/\/$/, "")}/api/evidence-text/${item.id}`);
  const urls = publicEvidenceUrls([...lookup.evidence.map((item) => item.sourceUrl), ...hosted], appUrl);
  if (urls.length === 0) {
    return {
      ok: false as const,
      status: 422,
      error: "GenLayer verification needs publicly reachable https evidence URLs. This result only has demo or local sources, so no transaction was created.",
    };
  }
  const evaluationId = `ftv_${crypto.randomUUID().replace(/-/g, "")}`;
  const payloadJson = studioPayload({
    productName: lookup.productName,
    brand: lookup.brand,
    barcode: lookup.barcode,
    lotNumber: lookup.lotNumber,
    expirationDate: lookup.expirationDate,
    region: lookup.region,
    evidenceUrls: urls,
    evidenceHash: lookup.result.evidenceHash,
    requestTimestamp: new Date().toISOString(),
  });
  await prisma.verificationResult.update({
    where: { id: lookup.result.id },
    data: { proposedEvaluationId: evaluationId },
  });
  return {
    ok: true as const,
    evaluationId,
    payloadJson,
    contractAddress: config.contractAddress,
    method: "submit_verification_request",
    chainId: config.chainId,
  };
}

export async function attachTransaction(lookupId: string, evaluationId: string, transactionId: string) {
  if (!isTransactionHash(transactionId)) return { ok: false as const, status: 400, error: "The transaction id is not a valid hash." };
  const lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true } });
  if (!lookup?.result) return { ok: false as const, status: 404, error: "That lookup was not found." };
  if (lookup.result.proposedEvaluationId !== evaluationId) {
    return { ok: false as const, status: 409, error: "The transaction does not match the prepared evaluation for this lookup." };
  }
  await prisma.verificationResult.update({
    where: { id: lookup.result.id },
    data: {
      genlayerEvaluationId: evaluationId,
      genlayerTransactionId: transactionId,
      finalizationStatus: "pending",
    },
  });
  return { ok: true as const };
}

async function saveUnlessFinalized(resultId: string, data: Prisma.VerificationResultUpdateManyMutationInput): Promise<boolean> {
  const saved = await prisma.verificationResult.updateMany({
    where: { id: resultId, finalizationStatus: { not: "finalized" } },
    data,
  });
  return saved.count > 0;
}

async function readStoredVerdict(evaluationId: string): Promise<ChainRecord | null> {
  let last: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const chain = await readContractResult("get_verification_result", evaluationId);
      if (chain && chain.request_id === evaluationId && isVerdict(chain.status)) return chain;
      last = new Error("The contract result did not match this evaluation.");
    } catch (error) {
      last = error;
    }
  }
  if (last) return null;
  return null;
}

export async function refreshVerification(lookupId: string) {
  const lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true } });
  if (!lookup?.result) return { ok: false as const, status: 404, error: "That lookup was not found." };
  const result = lookup.result;
  if (result.finalizationStatus === "finalized" && !result.isMock) {
    return { ok: true as const, finalizationStatus: "finalized" as const, detail: "The evaluation created by this transaction is finalized." };
  }
  if (result.isMock || result.finalizationStatus === "mock") {
    return { ok: true as const, finalizationStatus: "mock", detail: "MOCK RESULT. This lookup was not sent to GenLayer." };
  }
  if (!result.genlayerTransactionId || !result.genlayerEvaluationId) {
    const started = result.submittedAt ?? result.evaluatedAt;
    const waitingMs = Date.now() - started.getTime();
    if (result.finalizationStatus !== "preliminary" && waitingMs >= FINALIZATION_TIMEOUT_MS) {
      const detail = result.lastError || "GenLayer did not return a transaction id within 10 minutes.";
      await saveUnlessFinalized(result.id, { finalizationStatus: "unavailable", lastError: detail });
      return { ok: true as const, finalizationStatus: "unavailable" as const, detail };
    }
    return { ok: true as const, finalizationStatus: result.finalizationStatus, detail: "No GenLayer transaction is linked to this lookup yet." };
  }
  const started = result.submittedAt ?? result.evaluatedAt;
  const ageMs = Date.now() - started.getTime();
  const observedRaw = await fetchStudioTransaction(result.genlayerTransactionId);
  const observed = observedRaw ? mapTransactionObservation(observedRaw) : null;
  const decision = statusAfterWait({
    ageMs,
    observed: observed?.finalizationStatus ?? null,
    limitMs: FINALIZATION_TIMEOUT_MS,
    consensusLimitMs: CONSENSUS_TIMEOUT_MS,
  });

  if (!observed) {
    const detail = decision.timedOut
      ? "The GenLayer explorer and RPC did not return this transaction before the timeout."
      : "The transaction status is not available yet. No finalized result was applied.";
    await saveUnlessFinalized(result.id, { finalizationStatus: decision.finalizationStatus, lastError: detail });
    return { ok: true as const, finalizationStatus: decision.finalizationStatus, detail };
  }

  if (observed.finalizationStatus !== "finalized") {
    const detail = decision.timedOut
      ? "GenLayer did not finalize this evaluation within 30 minutes."
      : observed.detail;
    await saveUnlessFinalized(result.id, {
      finalizationStatus: decision.finalizationStatus,
      lastError: decision.finalizationStatus === "pending" || decision.finalizationStatus === "submitted" ? "" : detail,
    });
    return { ok: true as const, finalizationStatus: decision.finalizationStatus, detail };
  }

  const chain = await readStoredVerdict(result.genlayerEvaluationId);
  if (!chain || !isVerdict(chain.status)) {
    const gaveUp = ageMs >= CONSENSUS_TIMEOUT_MS;
    const detail = gaveUp
      ? "The transaction is finalized, but the contract result for this request could not be read before the timeout."
      : "The transaction is finalized, but FoodTrace could not read the evaluation created by this request. No other result was applied.";
    const status = gaveUp ? "failed" : "pending";
    await saveUnlessFinalized(result.id, { finalizationStatus: status, lastError: detail });
    return { ok: true as const, finalizationStatus: status, detail };
  }
  const evaluatedAt = chain.evaluatedAt ? new Date(chain.evaluatedAt) : new Date();
  const wrote = await saveUnlessFinalized(result.id, {
    status: chain.status,
    confidence: chain.confidence === "high" || chain.confidence === "medium" || chain.confidence === "low" ? chain.confidence : "low",
    reasoningSummary: chain.reasoningSummary || result.reasoningSummary,
    matchedCriteria: JSON.stringify(chain.matchedCriteria ?? []),
    finalizationStatus: "finalized",
    isMock: false,
    lastError: "",
    evaluatedAt: Number.isNaN(evaluatedAt.getTime()) ? new Date() : evaluatedAt,
    finalizedAt: new Date(),
    chainPayload: JSON.stringify(chain),
  });
  if (!wrote) {
    return { ok: true as const, finalizationStatus: "finalized" as const, detail: "The evaluation created by this transaction is finalized." };
  }
  await prisma.productLookup.update({ where: { id: lookupId }, data: { status: chain.status } });
  return { ok: true as const, finalizationStatus: "finalized" as const, detail: "The evaluation created by this transaction is finalized." };
}
