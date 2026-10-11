import { describe, expect, it } from "vitest";
import { canCoverFee, INSUFFICIENT_STUDIO_FUNDS } from "@/lib/wallet/funds";

describe("Studio Next fee coverage", () => {
  it("accepts a balance that covers the quoted fee", () => {
    expect(canCoverFee(BigInt("384522000010352"), BigInt("384522000010352"))).toBe(true);
  });

  it("rejects an insufficient balance", () => {
    expect(canCoverFee(BigInt("1898462250003649"), BigInt("384522000010352") * BigInt(10))).toBe(false);
    expect(INSUFFICIENT_STUDIO_FUNDS).toContain("does not have enough GenLayer Studio funds");
  });
});
