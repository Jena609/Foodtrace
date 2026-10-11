import { isAddress, verifyMessage } from "viem";
import { canonicalJson, sha256Hex } from "@/lib/evidence/hash";
import { foodTraceMessage } from "@/lib/security/message";

export { foodTraceMessage };

const MAX_SKEW_MS = 10 * 60 * 1000;

export interface SignedRequest {
  action: string;
  wallet: string;
  nonce: string;
  timestamp: string;
  signature: string;
  body: unknown;
}

export function bodyHash(body: unknown): string {
  return sha256Hex(canonicalJson(body));
}

export function timestampIsFresh(timestamp: string, now: number): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(now - parsed) <= MAX_SKEW_MS;
}

export async function verifyFoodTraceSignature(input: SignedRequest, now = Date.now()): Promise<{ ok: true; wallet: `0x${string}` } | { ok: false; error: string }> {
  if (!isAddress(input.wallet)) return { ok: false, error: "The wallet address is not valid." };
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(input.nonce)) return { ok: false, error: "The request nonce is not valid." };
  if (!timestampIsFresh(input.timestamp, now)) return { ok: false, error: "The signature timestamp has expired. Try again." };
  if (!/^0x[0-9a-fA-F]+$/.test(input.signature)) return { ok: false, error: "The signature is not valid." };
  const message = foodTraceMessage({
    action: input.action,
    wallet: input.wallet,
    nonce: input.nonce,
    timestamp: input.timestamp,
    bodyHash: bodyHash(input.body),
  });
  try {
    const valid = await verifyMessage({
      address: input.wallet,
      message,
      signature: input.signature as `0x${string}`,
    });
    if (!valid) return { ok: false, error: "The wallet signature did not match this request." };
  } catch {
    return { ok: false, error: "The wallet signature could not be verified." };
  }
  return { ok: true, wallet: input.wallet.toLowerCase() as `0x${string}` };
}

export function walletsMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function consumeNonce(store: Set<string>, wallet: string, nonce: string): boolean {
  const key = `${wallet.toLowerCase()}:${nonce}`;
  if (store.has(key)) return false;
  store.add(key);
  return true;
}
