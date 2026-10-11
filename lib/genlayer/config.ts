import { isAddress } from "viem";

/**
 * GenLayer Studio Next, documented at https://docs.genlayer.com/developers/networks
 * and used by the Studio Next explorer. FoodTrace does not connect to Bradbury,
 * Studionet, or Localnet.
 */
export const STUDIO_NEXT = {
  name: "GenLayer Studio Next",
  canonicalName: "studio-dev",
  chainId: 61997,
  rpcUrl: "https://studio-dev.genlayer.com/api",
  explorerUrl: "https://explorer-studio-dev.genlayer.com",
  studioWebApp: "https://studio-dev.genlayer.com",
  currencyName: "GEN",
  currencySymbol: "GEN",
  decimals: 18,
} as const;

export const UNAVAILABLE_MESSAGE = "GenLayer verification is currently unavailable. No finalized result was created.";

export type GenLayerMode = "mock" | "studio";

export interface GenLayerConfig {
  mode: GenLayerMode;
  requestedMode: string;
  networkName: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  explorerUrl: string;
  studioReady: boolean;
  walletConnectConfigured: boolean;
  unavailableReason: string | null;
}

function sameUrl(left: string, right: string): boolean {
  return left.replace(/\/$/, "") === right.replace(/\/$/, "");
}

export function resolveGenLayerConfig(env: Record<string, string | undefined>): GenLayerConfig {
  const requested = (env.FOODTRACE_GENLAYER_MODE ?? "mock").trim().toLowerCase() || "mock";
  const network = (env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "studio").trim().toLowerCase();
  const rpcUrl = (env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "").trim();
  const contract = (env.NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS ?? "").trim();
  const projectId = (env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "").trim();
  const contractAddress = isAddress(contract) ? contract : "";
  const base = {
    requestedMode: requested,
    networkName: STUDIO_NEXT.name,
    chainId: STUDIO_NEXT.chainId,
    rpcUrl,
    contractAddress,
    explorerUrl: STUDIO_NEXT.explorerUrl,
    walletConnectConfigured: projectId.length > 0,
  };

  if (requested !== "studio") {
    return { ...base, mode: "mock", studioReady: false, unavailableReason: null };
  }

  const problems: string[] = [];
  if (network !== "studio") problems.push("NEXT_PUBLIC_GENLAYER_NETWORK must be studio.");
  if (!rpcUrl || !sameUrl(rpcUrl, STUDIO_NEXT.rpcUrl)) {
    problems.push("NEXT_PUBLIC_GENLAYER_RPC_URL must be the GenLayer Studio Next endpoint.");
  }
  if (!contractAddress) problems.push("NEXT_PUBLIC_FOODTRACE_CONTRACT_ADDRESS is missing.");
  if (problems.length > 0) {
    return { ...base, mode: "studio", studioReady: false, unavailableReason: problems.join(" ") };
  }
  return { ...base, mode: "studio", studioReady: true, unavailableReason: null };
}

export function publicConfig(env: Record<string, string | undefined> = process.env) {
  const gen = resolveGenLayerConfig(env);
  return {
    genlayerMode: gen.mode,
    studioConfigured: gen.studioReady,
    unavailableReason: gen.mode === "studio" ? gen.unavailableReason : null,
    walletConnectConfigured: gen.walletConnectConfigured,
    networkName: gen.networkName,
    chainId: gen.chainId,
    explorerUrl: gen.explorerUrl,
    studioWebApp: STUDIO_NEXT.studioWebApp,
    contractConfigured: Boolean(gen.contractAddress),
    contractAddress: gen.contractAddress,
    rpcConfigured: Boolean(gen.rpcUrl),
    openFdaEnabled: env.FOODTRACE_OPENFDA_ENABLED === "true",
    manufacturerConfigured: Boolean(env.FOODTRACE_MANUFACTURER_API_URL?.trim()),
    retailerConfigured: Boolean(env.FOODTRACE_RETAILER_API_URL?.trim()),
    appUrl: env.NEXT_PUBLIC_APP_URL?.trim() || "",
    sessionSecretIsDefault: (env.FOODTRACE_SESSION_SECRET ?? "dev-only-change-me") === "dev-only-change-me",
  };
}
