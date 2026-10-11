export type WalletPhase = "disconnected" | "connecting" | "connected" | "rejected" | "wrong_network" | "unsupported";

export interface WalletSnapshot {
  phase: WalletPhase;
  address: string | null;
  chainId: number | null;
  error: string | null;
}

export type WalletEvent =
  | { type: "connect_start" }
  | { type: "connected"; address: string; chainId: number }
  | { type: "rejected"; message: string }
  | { type: "disconnect" }
  | { type: "account_change"; address: string | null }
  | { type: "network_change"; chainId: number | null }
  | { type: "unsupported"; message: string };

export const initialWalletSnapshot: WalletSnapshot = {
  phase: "disconnected",
  address: null,
  chainId: null,
  error: null,
};

function withChain(address: string, chainId: number | null, expectedChainId: number): WalletSnapshot {
  if (chainId === null) {
    return { phase: "wrong_network", address, chainId, error: "The wallet has not reported a chain ID." };
  }
  if (chainId !== expectedChainId) {
    return {
      phase: "wrong_network",
      address,
      chainId,
      error: `Wrong network. FoodTrace studio verification uses GenLayer Studio Next, chain ID ${expectedChainId}.`,
    };
  }
  return { phase: "connected", address, chainId, error: null };
}

export function walletReducer(state: WalletSnapshot, event: WalletEvent, expectedChainId: number): WalletSnapshot {
  switch (event.type) {
    case "connect_start":
      return { phase: "connecting", address: null, chainId: state.chainId, error: null };
    case "connected":
      return withChain(event.address, event.chainId, expectedChainId);
    case "rejected":
      return { phase: "rejected", address: null, chainId: state.chainId, error: event.message };
    case "disconnect":
      return initialWalletSnapshot;
    case "account_change":
      if (!event.address) return initialWalletSnapshot;
      return withChain(event.address, state.chainId, expectedChainId);
    case "network_change":
      if (!state.address) return { ...state, chainId: event.chainId, phase: "disconnected" };
      return withChain(state.address, event.chainId, expectedChainId);
    case "unsupported":
      return { phase: "unsupported", address: null, chainId: null, error: event.message };
    default:
      return state;
  }
}

export function walletErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = error && typeof error === "object" && "code" in error ? Number((error as { code?: number }).code) : NaN;
  if (code === 4001 || /rejected|denied|cancel/i.test(message)) {
    return "The wallet request was rejected. Nothing was submitted.";
  }
  if (/unsupported/i.test(message)) return "This wallet cannot complete the request.";
  if (/switch/i.test(message) && /reject|denied|cancel/i.test(message)) {
    return "The network switch did not complete. FoodTrace stays on the current network.";
  }
  return message.slice(0, 240) || "The wallet request failed.";
}
