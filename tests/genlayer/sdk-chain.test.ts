import { describe, expect, it } from "vitest";
import { studioDevnet, studionet } from "genlayer-js/chains";
import { STUDIO_NEXT } from "@/lib/genlayer/config";
import { studioSdkMatchesDocumentedNetwork, studioSdkRpcUrl } from "@/lib/genlayer/sdk";

describe("GenLayer SDK studio chain", () => {
  it("matches the documented Studio Next chain id and RPC", () => {
    expect(studioSdkMatchesDocumentedNetwork()).toBe(true);
    expect(studioDevnet.id).toBe(61997);
    expect(studioSdkRpcUrl()).toBe(STUDIO_NEXT.rpcUrl);
    expect(studioDevnet.isStudio).toBe(true);
  });

  it("keeps the SDK consensus contracts on studioDevnet", () => {
    const main = studioDevnet.consensusMainContract?.address;
    const data = studioDevnet.consensusDataContract?.address;
    expect(main).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(data).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(main).toBe(studionet.consensusMainContract?.address);
    expect(data).toBe(studionet.consensusDataContract?.address);
    expect(studionet.id).toBe(61999);
  });
});
