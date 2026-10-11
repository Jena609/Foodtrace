import { describe, expect, it } from "vitest";
import { initialWalletSnapshot, walletErrorMessage, walletReducer } from "@/lib/wallet/reducer";

const CHAIN = 61997;

describe("wallet reducer", () => {
  it("connects on the expected network", () => {
    const state = walletReducer(initialWalletSnapshot, { type: "connected", address: "0xabc", chainId: CHAIN }, CHAIN);
    expect(state.phase).toBe("connected");
    expect(state.address).toBe("0xabc");
  });

  it("records a rejected connection without keeping an address", () => {
    const connecting = walletReducer(initialWalletSnapshot, { type: "connect_start" }, CHAIN);
    const rejected = walletReducer(connecting, { type: "rejected", message: "The wallet request was rejected. Nothing was submitted." }, CHAIN);
    expect(rejected.phase).toBe("rejected");
    expect(rejected.address).toBeNull();
  });

  it("marks the wrong network", () => {
    const state = walletReducer(initialWalletSnapshot, { type: "connected", address: "0xabc", chainId: 1 }, CHAIN);
    expect(state.phase).toBe("wrong_network");
    expect(state.error).toContain("61997");
  });

  it("disconnects back to a signed-out state", () => {
    const connected = walletReducer(initialWalletSnapshot, { type: "connected", address: "0xabc", chainId: CHAIN }, CHAIN);
    expect(walletReducer(connected, { type: "disconnect" }, CHAIN)).toEqual(initialWalletSnapshot);
  });

  it("follows an account change", () => {
    const connected = walletReducer(initialWalletSnapshot, { type: "connected", address: "0xabc", chainId: CHAIN }, CHAIN);
    const changed = walletReducer(connected, { type: "account_change", address: "0xdef" }, CHAIN);
    expect(changed.address).toBe("0xdef");
    expect(changed.phase).toBe("connected");
    expect(walletReducer(changed, { type: "account_change", address: null }, CHAIN).phase).toBe("disconnected");
  });

  it("follows a network change", () => {
    const connected = walletReducer(initialWalletSnapshot, { type: "connected", address: "0xabc", chainId: CHAIN }, CHAIN);
    const wrong = walletReducer(connected, { type: "network_change", chainId: 61999 }, CHAIN);
    expect(wrong.phase).toBe("wrong_network");
    const restored = walletReducer(wrong, { type: "network_change", chainId: CHAIN }, CHAIN);
    expect(restored.phase).toBe("connected");
  });

  it("maps wallet rejection errors", () => {
    expect(walletErrorMessage({ code: 4001, message: "User rejected the request" })).toContain("rejected");
  });
});
