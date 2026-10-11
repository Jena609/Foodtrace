import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { STUDIO_NEXT, UNAVAILABLE_MESSAGE } from "@/lib/genlayer/config";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function sameUrl(left: string, right: string): boolean {
  return left.replace(/\/$/, "") === right.replace(/\/$/, "");
}

export function studioSdkRpcUrl(): string {
  return studioDevnet.rpcUrls.default.http[0] ?? "";
}

/** The documented Studio Next endpoint and the installed SDK chain must be the same network. */
export function studioSdkMatchesDocumentedNetwork(): boolean {
  return studioDevnet.id === STUDIO_NEXT.chainId && sameUrl(studioSdkRpcUrl(), STUDIO_NEXT.rpcUrl);
}

export function assertConfiguredStudioRpc(configuredRpc: string | undefined): void {
  const configured = configuredRpc?.trim() ?? "";
  if (!studioSdkMatchesDocumentedNetwork() || !configured || !sameUrl(configured, studioSdkRpcUrl())) {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
}

export async function createStudioClient(options?: {
  account?: `0x${string}`;
  provider?: Eip1193Provider;
}) {
  assertConfiguredStudioRpc(process.env.NEXT_PUBLIC_GENLAYER_RPC_URL);
  // createClient writes the endpoint onto the chain object. studioDevnet is shared,
  // so a matching RPC is required above and is not passed in as an override.
  return createClient({
    chain: studioDevnet,
    account: options?.account,
    provider: options?.provider,
  });
}
