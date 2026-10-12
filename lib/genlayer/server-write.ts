import { createAccount } from "genlayer-js";
import type { Address } from "viem";
import { prisma } from "@/lib/db/client";
import { ensureDatabase } from "@/lib/db/ensure";
import { logServerError } from "@/lib/db/log";
import { UNAVAILABLE_MESSAGE, resolveGenLayerConfig } from "@/lib/genlayer/config";
import { createStudioClient } from "@/lib/genlayer/sdk";
import { publicEvidenceUrls, safeGenLayerError, studioPayload } from "@/lib/genlayer/studio";
import { catalogSearchRecord } from "@/lib/sources/demo-data";

const EXPECTED_SIGNER = "0x5f85c75f8442b92ba66c30371cef6cf3d7b4c650";
const LOCK_WAIT_MS = 75_000;
const DEPOSIT_WAIT = "The Studio signer does not have enough GEN for this verification deposit. This check stays pending until the deposit is free.";
const WRITE_WAIT = "Another verification is using the Studio deposit. This check stays pending and will be submitted when that write finishes.";

type SubmitResult = { ok: true; hash: string; evaluationId: string } | { ok: false; queued?: boolean; error: string };

function hashFrom(value: unknown): `0x${string}` | null {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)) return value as `0x${string}`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["hash", "transactionHash", "txHash"]) {
      const found = hashFrom(record[key]);
      if (found) return found;
    }
  }
  return null;
}

function signerAccount() {
  const raw = process.env.FOODTRACE_GENLAYER_SIGNER_PRIVATE_KEY?.trim() ?? "";
  const key = raw.startsWith("0x") ? raw : raw ? `0x${raw}` : "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  const account = createAccount(key as `0x${string}`);
  if (account.address.toLowerCase() !== EXPECTED_SIGNER) return null;
  return account;
}

export function signerConfigured(): boolean {
  return signerAccount() !== null;
}

export async function continueServerVerification(lookupId: string): Promise<void> {
  const lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true } });
  const result = lookup?.result;
  if (!result || result.isMock || result.finalizationStatus === "mock" || result.finalizationStatus === "finalized") return;
  if (result.genlayerTransactionId) return;
  if (result.finalizationStatus !== "submitted" && result.finalizationStatus !== "pending") return;
  await submitServerVerification(lookupId);
}

export async function submitServerVerification(lookupId: string): Promise<SubmitResult> {
  const config = resolveGenLayerConfig(process.env);
  if (config.mode !== "studio" || !config.studioReady) return { ok: false, error: UNAVAILABLE_MESSAGE };
  const account = signerAccount();
  if (!account) return { ok: false, error: UNAVAILABLE_MESSAGE };
  let lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true, evidence: true } });
  if (!lookup?.result) return { ok: false, error: "That lookup was not found." };
  const retryable = ["failed", "unavailable", "inconclusive", "disputed"].includes(lookup.result.finalizationStatus);
  if (lookup.result.genlayerTransactionId && lookup.result.genlayerEvaluationId && !retryable) {
    return { ok: true, hash: lookup.result.genlayerTransactionId, evaluationId: lookup.result.genlayerEvaluationId };
  }
  let locked = false;
  try {
    locked = await acquireWriteLock(lookupId);
  } catch (error) {
    logServerError("genlayer.lock", error);
    return { ok: false, error: safeGenLayerError(error) };
  }
  if (!locked) return markQueued(lookup.result.id, lookup.result.submittedAt, config, WRITE_WAIT);
  try {
    lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true, evidence: true } });
    if (!lookup?.result) return { ok: false, error: "That lookup was not found." };
    if (lookup.result.finalizationStatus === "finalized" && lookup.result.genlayerTransactionId && lookup.result.genlayerEvaluationId) {
      return { ok: true, hash: lookup.result.genlayerTransactionId, evaluationId: lookup.result.genlayerEvaluationId };
    }
    if (lookup.result.genlayerTransactionId && lookup.result.genlayerEvaluationId && !retryable) {
      return { ok: true, hash: lookup.result.genlayerTransactionId, evaluationId: lookup.result.genlayerEvaluationId };
    }
    if (retryable && lookup.result.genlayerTransactionId) {
      await prisma.verificationResult.updateMany({
        where: { id: lookup.result.id, finalizationStatus: { not: "finalized" } },
        data: {
          lastError: `Previous transaction ${lookup.result.genlayerTransactionId} did not finalize. A new evaluation was submitted.`,
          genlayerTransactionId: "",
          genlayerEvaluationId: "",
          proposedEvaluationId: "",
          finalizationStatus: "submitted",
          submittedAt: new Date(),
        },
      });
      lookup = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true, evidence: true } });
      if (!lookup?.result) return { ok: false, error: "That lookup was not found." };
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
    const productUrls = publicEvidenceUrls(lookup.evidence.map((item) => item.sourceUrl), appUrl);
    const urls = productUrls.length > 0 ? productUrls : publicEvidenceUrls([catalogSearchRecord().sourceUrl], appUrl);
    if (urls.length === 0) {
      const error = "GenLayer verification needs publicly reachable https evidence URLs. No transaction was created.";
      await prisma.verificationResult.updateMany({
        where: { id: lookup.result.id, finalizationStatus: { not: "finalized" }, genlayerTransactionId: "" },
        data: { finalizationStatus: "unavailable", isMock: false, lastError: error },
      });
      return { ok: false, error };
    }
    const evaluationId = lookup.result.genlayerEvaluationId || `ftv_${crypto.randomUUID().replace(/-/g, "")}`;
    const submittedAt = lookup.result.submittedAt ?? new Date();
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
    await prisma.verificationResult.updateMany({
      where: { id: lookup.result.id, finalizationStatus: { not: "finalized" }, genlayerTransactionId: "" },
      data: {
        proposedEvaluationId: evaluationId,
        genlayerEvaluationId: evaluationId,
        finalizationStatus: "submitted",
        isMock: false,
        submittedAt,
        genlayerNetwork: config.networkName,
        genlayerChainId: config.chainId,
        contractAddress: config.contractAddress,
        lastError: "",
      },
    });
    const client = await createStudioClient({ account });
    const call = {
      address: config.contractAddress as Address,
      functionName: "submit_verification_request",
      args: [evaluationId, payloadJson] as string[],
    };
    const estimate = await estimateWrite(client, call);
    const balanceResponse = await fetch(config.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [account.address, "latest"] }),
    });
    const balancePayload = (await balanceResponse.json()) as { result?: string };
    const balance = typeof balancePayload.result === "string" ? BigInt(balancePayload.result) : BigInt(0);
    if (balance < estimate.feeValue) return markQueued(lookup.result.id, submittedAt, config, DEPOSIT_WAIT);
    const written = await client.writeContract({
      ...call,
      fees: {
        distribution: estimate.distribution,
        feeValue: estimate.feeValue,
        ...(estimate.messageAllocations ? { messageAllocations: estimate.messageAllocations } : {}),
      },
    });
    const hash = hashFrom(written);
    if (!hash) throw new Error("GenLayer did not return a transaction id. Nothing was marked finalized.");
    await prisma.verificationResult.updateMany({
      where: { id: lookup.result.id, finalizationStatus: { not: "finalized" } },
      data: {
        genlayerTransactionId: hash,
        genlayerEvaluationId: evaluationId,
        finalizationStatus: "submitted",
        isMock: false,
        submittedAt,
        genlayerNetwork: config.networkName,
        genlayerChainId: config.chainId,
        contractAddress: config.contractAddress,
        explorerTransactionUrl: `${config.explorerUrl}/tx/${hash}`,
        lastError: "",
      },
    });
    return { ok: true, hash, evaluationId };
  } catch (error) {
    const reason = safeGenLayerError(error);
    logServerError("genlayer.submit", error);
    const current = await prisma.productLookup.findUnique({ where: { id: lookupId }, include: { result: true } });
    if (current?.result && !current.result.genlayerTransactionId) {
      await prisma.verificationResult.updateMany({
        where: { id: current.result.id, finalizationStatus: { not: "finalized" }, genlayerTransactionId: "" },
        data: { finalizationStatus: "unavailable", isMock: false, lastError: reason },
      });
    }
    return { ok: false, error: reason };
  } finally {
    await releaseWriteLock(lookupId);
  }
}

async function markQueued(resultId: string, submittedAt: Date | null, config: { networkName: string; chainId: number; contractAddress: string }, reason: string): Promise<SubmitResult> {
  await prisma.verificationResult.updateMany({
    where: { id: resultId, finalizationStatus: { not: "finalized" }, genlayerTransactionId: "" },
    data: {
      finalizationStatus: "submitted",
      isMock: false,
      submittedAt: submittedAt ?? new Date(),
      genlayerNetwork: config.networkName,
      genlayerChainId: config.chainId,
      contractAddress: config.contractAddress,
      lastError: reason,
    },
  });
  return { ok: false, queued: true, error: reason };
}

async function acquireWriteLock(lookupId: string): Promise<boolean> {
  await ensureDatabase();
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOCK_WAIT_MS).toISOString();
  const changed = await prisma.$executeRaw`
    UPDATE "GenLayerWriteLock"
    SET "owner" = ${lookupId}, "lockedAt" = ${now.toISOString()}
    WHERE "id" = 'write' AND ("owner" = '' OR "lockedAt" < ${cutoff})
  `;
  return Number(changed) > 0;
}

async function releaseWriteLock(lookupId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "GenLayerWriteLock"
    SET "owner" = '', "lockedAt" = ${"1970-01-01T00:00:00.000Z"}
    WHERE "id" = 'write' AND "owner" = ${lookupId}
  `;
}

/** Studio fee simulation can fail once with a GenVM internal error. Retry that failure before giving up. */
async function estimateWrite(client: Awaited<ReturnType<typeof createStudioClient>>, call: { address: Address; functionName: string; args: string[] }) {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await client.estimateTransactionFeesForWrite(call);
    } catch (error) {
      last = error;
      const message = error instanceof Error ? error.message : "";
      if (!/genvm internal error|internal error/i.test(message) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw last;
}
