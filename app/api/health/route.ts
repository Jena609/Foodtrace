import { databaseProvider, prisma } from "@/lib/db/client";
import { logServerError } from "@/lib/db/log";
import { apiError, apiOk } from "@/lib/http";
import { publicConfig, resolveGenLayerConfig } from "@/lib/genlayer/config";
import { readContractResult } from "@/lib/genlayer/studio";
import { signerConfigured } from "@/lib/genlayer/server-write";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function rpcStatus(rpcUrl: string, expectedChainId: number): Promise<{ rpc: "ok" | "unavailable"; chainId: number | null }> {
  if (!rpcUrl) return { rpc: "unavailable", chainId: null };
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(4000),
    });
    const payload = (await response.json()) as { result?: string };
    const chainId = typeof payload.result === "string" ? Number.parseInt(payload.result, 16) : null;
    const matches = response.ok && chainId === expectedChainId;
    return { rpc: matches ? "ok" : "unavailable", chainId: Number.isInteger(chainId) ? chainId : null };
  } catch {
    return { rpc: "unavailable", chainId: null };
  }
}

async function contractStatus(): Promise<"ok" | "missing" | "unavailable"> {
  const config = resolveGenLayerConfig(process.env);
  if (!config.studioReady || !config.contractAddress) return "unavailable";
  try {
    const value = await Promise.race([
      readContractResult("get_verification_result", "ftv_healthcheck"),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);
    return value ? "ok" : "unavailable";
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/not found|no contract|does not exist/i.test(message)) return "missing";
    return "unavailable";
  }
}

export async function GET() {
  try {
    await prisma.user.count();
    const config = resolveGenLayerConfig(process.env);
    const [pending, failed, finalized, unavailable, last, rpc, contract] = await Promise.all([
      prisma.verificationResult.count({ where: { isMock: false, finalizationStatus: { in: ["pending", "submitted"] } } }),
      prisma.verificationResult.count({ where: { isMock: false, finalizationStatus: { in: ["failed", "inconclusive", "disputed"] } } }),
      prisma.verificationResult.count({ where: { isMock: false, finalizationStatus: "finalized" } }),
      prisma.verificationResult.count({ where: { isMock: false, finalizationStatus: "unavailable" } }),
      prisma.verificationResult.findFirst({
        where: { finalizationStatus: "finalized", isMock: false },
        orderBy: { evaluatedAt: "desc" },
        select: {
          lookupId: true,
          genlayerEvaluationId: true,
          genlayerTransactionId: true,
          finalizedAt: true,
          evaluatedAt: true,
        },
      }),
      rpcStatus(config.rpcUrl, config.chainId),
      contractStatus(),
    ]);
    return apiOk({
      ok: true,
      database: "ok",
      databaseProvider: databaseProvider(),
      genlayer: {
        rpc: rpc.rpc,
        chainId: rpc.chainId,
        contract,
        signer: signerConfigured() ? "configured" : "missing",
        lastSuccessfulEvaluation: last
          ? {
              lookupId: last.lookupId,
              evaluationId: last.genlayerEvaluationId,
              transactionId: last.genlayerTransactionId,
              finalizedAt: (last.finalizedAt ?? last.evaluatedAt).toISOString(),
            }
          : null,
        pending,
        failed,
        finalized,
        unavailable,
      },
      config: { ...publicConfig(), signerConfigured: signerConfigured() },
    });
  } catch (error) {
    logServerError("health", error);
    return apiError(503, "database_unavailable", "The database is not reachable.");
  }
}
