import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { productSearchSchema, appealSchema, zodErrorMessage } from "@/lib/validation/schemas";
import { bodyHash, consumeNonce, foodTraceMessage, verifyFoodTraceSignature, walletsMatch } from "@/lib/security/signature";
import { readSession, signSession } from "@/lib/security/session";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { FORBIDDEN_STATUS_LABELS, STATUS_COPY } from "@/lib/copy";

describe("security and validation", () => {
  it("rejects an empty lookup and a bad barcode", () => {
    const empty = productSearchSchema.safeParse({});
    expect(empty.success).toBe(false);
    if (!empty.success) expect(zodErrorMessage(empty.error)).toContain("barcode");
    const bad = productSearchSchema.safeParse({ barcode: "12", productName: "" });
    expect(bad.success).toBe(false);
    const good = productSearchSchema.safeParse({ productName: "Harbor Mill Whole Milk", expirationDate: "2026-11-02" });
    expect(good.success).toBe(true);
  });

  it("rejects an appeal with a non-https evidence link", () => {
    const result = appealSchema.safeParse({
      lookupId: "lk_12345678",
      reason: "new_evidence",
      newEvidenceUrl: "http://example.com/notice",
      explanation: "A later public notice describes this lot.",
    });
    expect(result.success).toBe(false);
  });

  it("verifies a wallet signature and rejects a replayed nonce", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const body = { lookupId: "lk_12345678" };
    const timestamp = new Date().toISOString();
    const nonce = "nonce_12345678";
    const message = foodTraceMessage({
      action: "appeal.create",
      wallet: account.address,
      nonce,
      timestamp,
      bodyHash: bodyHash(body),
    });
    const signature = await account.signMessage({ message });
    const verified = await verifyFoodTraceSignature({
      action: "appeal.create",
      wallet: account.address,
      nonce,
      timestamp,
      signature,
      body,
    });
    expect(verified.ok).toBe(true);
    const store = new Set<string>();
    expect(consumeNonce(store, account.address, nonce)).toBe(true);
    expect(consumeNonce(store, account.address, nonce)).toBe(false);
    expect(walletsMatch(account.address, account.address.toLowerCase())).toBe(true);
    expect(walletsMatch(account.address, "0x0000000000000000000000000000000000000001")).toBe(false);
  });

  it("round-trips a session token and rejects a tampered one", () => {
    const secret = "test-secret-value";
    const token = signSession("usr_abcdefghijklmnop", secret, Date.now() + 10_000);
    expect(readSession(token, secret, Date.now())).toBe("usr_abcdefghijklmnop");
    expect(readSession(`${token}x`, secret, Date.now())).toBeNull();
    expect(readSession(token, "other-secret", Date.now())).toBeNull();
  });

  it("rate limits a repeated caller", () => {
    const limiter = createRateLimiter(2, 1_000);
    expect(limiter.check("1.1.1.1", 0).ok).toBe(true);
    expect(limiter.check("1.1.1.1", 10).ok).toBe(true);
    expect(limiter.check("1.1.1.1", 20).ok).toBe(false);
    expect(limiter.check("1.1.1.1", 2_000).ok).toBe(true);
  });

  it("does not use forbidden safety statuses", () => {
    const text = JSON.stringify(STATUS_COPY).toUpperCase();
    for (const label of FORBIDDEN_STATUS_LABELS) expect(text).not.toContain(label);
  });
});
