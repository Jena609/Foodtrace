import { describe, expect, it } from "vitest";
import { UNAVAILABLE_MESSAGE, resolveGenLayerConfig } from "@/lib/genlayer/config";
import { mapTransactionObservation, readLinkedEvaluation } from "@/lib/genlayer/observation";

describe("GenLayer mode", () => {
  it("defaults to mock and does not claim studio readiness", () => {
    const config = resolveGenLayerConfig({});
    expect(config.mode).toBe("mock");
    expect(config.studioReady).toBe(false);
  });

  it("stays in studio mode when studio is requested but not configured", () => {
    const config = resolveGenLayerConfig({ FOODTRACE_GENLAYER_MODE: "studio" });
    expect(config.mode).toBe("studio");
    expect(config.studioReady).toBe(false);
    expect(config.unavailableReason).toContain("NEXT_PUBLIC_GENLAYER_RPC_URL");
    expect(UNAVAILABLE_MESSAGE).toContain("No finalized result was created");
  });

  it("is studio-ready only with the Studio Next endpoint and a contract address", () => {
    const ready = resolveGenLayerConfig({
      FOODTRACE_GENLAYER_MODE: "studio",
      NEXT_PUBLIC_GENLAYER_NETWORK: "studio",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio-dev.genlayer.com/api",
      NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS: "0x3973d96145dBe83d61b36C86266D758dD3655a14",
    });
    expect(ready.studioReady).toBe(true);
    const wrongRpc = resolveGenLayerConfig({
      FOODTRACE_GENLAYER_MODE: "studio",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS: "0x3973d96145dBe83d61b36C86266D758dD3655a14",
    });
    expect(wrongRpc.mode).toBe("studio");
    expect(wrongRpc.studioReady).toBe(false);
  });

  it("maps pending, finalized, disputed, inconclusive, and failed transactions", () => {
    expect(mapTransactionObservation({ statusName: "PENDING" }).finalizationStatus).toBe("pending");
    expect(mapTransactionObservation({ statusName: "ACCEPTED", resultName: "MAJORITY_AGREE" }).finalizationStatus).toBe("pending");
    expect(mapTransactionObservation({ statusName: "FINALIZED", resultName: "MAJORITY_AGREE", txExecutionResultName: "FINISHED_WITH_RETURN" }).finalizationStatus).toBe("finalized");
    expect(mapTransactionObservation({ statusName: "FINALIZED", resultName: "MAJORITY_DISAGREE", txExecutionResultName: "FINISHED_WITH_RETURN" }).finalizationStatus).toBe("disputed");
    expect(mapTransactionObservation({ statusName: "UNDETERMINED" }).finalizationStatus).toBe("inconclusive");
    expect(mapTransactionObservation({ statusName: "FINALIZED", resultName: "FAILURE", txExecutionResultName: "FINISHED_WITH_ERROR" }).finalizationStatus).toBe("failed");
  });

  it("reads the evaluation linked to a transaction instead of the newest evaluation", () => {
    const links = [
      { evaluationId: "ftv_one", transactionId: "0xaaa", lookupId: "lookup-1" },
      { evaluationId: "ftv_two", transactionId: "0xbbb", lookupId: "lookup-1" },
    ];
    expect(readLinkedEvaluation(links, "0xaaa")?.evaluationId).toBe("ftv_one");
    expect(readLinkedEvaluation(links, "0xBBB")?.evaluationId).toBe("ftv_two");
    expect(readLinkedEvaluation(links, "0xccc")).toBeNull();
  });
});
