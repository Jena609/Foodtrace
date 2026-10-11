import { isAddress, type Address } from "viem";
import { prisma } from "@/lib/db/client";
import { isFetchablePublicUrl } from "@/lib/security/url";
import { UNAVAILABLE_MESSAGE, resolveGenLayerConfig } from "@/lib/genlayer/config";
import { isTransactionHash, mapTransactionObservation } from "@/lib/genlayer/observation";
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

function unwrapTransaction(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (typeof record.statusName === "string" || typeof record.status_name === "string") return record;
  if (record.transaction && typeof record.transaction === "object") return unwrapTransaction(record.transaction);
  if (record.data && typeof record.data === "object") return unwrapTransaction(record.data);
  if (record.result && typeof record.result === "object") return unwrapTransaction(record.result);
  return record;
}

export async function fetchStudioTransaction(hash: string): Promise<unknown | null> {
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

export async function refreshVerification(lookupId: string) {
  const lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true } });
  if (!lookup?.result) return { ok: false as const, status: 404, error: "That lookup was not found." };
  const result = lookup.result;
  if (result.isMock || result.finalizationStatus === "mock") {
    return { ok: true as const, finalizationStatus: "mock", detail: "MOCK RESULT. This lookup was not sent to GenLayer." };
  }
  if (!result.genlayerTransactionId || !result.genlayerEvaluationId) {
    return { ok: true as const, finalizationStatus: result.finalizationStatus, detail: "No GenLayer transaction is linked to this lookup." };
  }
  const observedRaw = await fetchStudioTransaction(result.genlayerTransactionId);
  if (!observedRaw) {
    return { ok: true as const, finalizationStatus: "pending", detail: "The transaction status is not available yet. No finalized result was applied." };
  }
  const observed = mapTransactionObservation(observedRaw);
  if (observed.finalizationStatus !== "finalized") {
    await prisma.verificationResult.update({
      where: { id: result.id },
      data: { finalizationStatus: observed.finalizationStatus },
    });
    return { ok: true as const, finalizationStatus: observed.finalizationStatus, detail: observed.detail };
  }
  let chain: ChainRecord | null = null;
  try {
    chain = await readContractResult("get_verification_result", result.genlayerEvaluationId);
  } catch {
    chain = null;
  }
  if (!chain || chain.request_id !== result.genlayerEvaluationId || !isVerdict(chain.status)) {
    return {
      ok: true as const,
      finalizationStatus: "pending",
      detail: "The transaction is finalized, but FoodTrace could not read the evaluation created by this request. No other result was applied.",
    };
  }
  const evaluatedAt = chain.evaluatedAt ? new Date(chain.evaluatedAt) : new Date();
  await prisma.verificationResult.update({
    where: { id: result.id },
    data: {
      status: chain.status,
      confidence: chain.confidence === "high" || chain.confidence === "medium" || chain.confidence === "low" ? chain.confidence : "low",
      reasoningSummary: chain.reasoningSummary || result.reasoningSummary,
      matchedCriteria: JSON.stringify(chain.matchedCriteria ?? []),
      finalizationStatus: "finalized",
      isMock: false,
      evaluatedAt: Number.isNaN(evaluatedAt.getTime()) ? new Date() : evaluatedAt,
      chainPayload: JSON.stringify(chain),
    },
  });
  await prisma.productLookup.update({ where: { id: lookupId }, data: { status: chain.status } });
  return { ok: true as const, finalizationStatus: "finalized" as const, detail: "The evaluation created by this transaction is finalized." };
}
