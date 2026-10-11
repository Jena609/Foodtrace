"use client";

import { useAccount, useWalletClient } from "wagmi";
import { canonicalJson } from "@/lib/evidence/canonical";
import { foodTraceMessage } from "@/lib/security/message";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function useSignedFetch() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  async function raw(url: string, action: string, body: unknown, method = "POST") {
    if (!address || !walletClient) throw new Error("Connect a wallet to continue.");
    const nonce = `n${crypto.randomUUID().replace(/-/g, "")}`;
    const timestamp = new Date().toISOString();
    const message = foodTraceMessage({
      action,
      wallet: address,
      nonce,
      timestamp,
      bodyHash: await sha256Hex(canonicalJson(body)),
    });
    const signature = await walletClient.signMessage({ account: address, message });
    return fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-foodtrace-action": action,
        "x-foodtrace-wallet": address,
        "x-foodtrace-nonce": nonce,
        "x-foodtrace-timestamp": timestamp,
        "x-foodtrace-signature": signature,
      },
      body: method === "GET" ? undefined : JSON.stringify(body),
    });
  }

  async function json<T extends Record<string, unknown>>(url: string, action: string, body: unknown, method = "POST"): Promise<T> {
    const response = await raw(url, action, body, method);
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || "The request failed.");
    return payload;
  }

  return { json, raw };
}
