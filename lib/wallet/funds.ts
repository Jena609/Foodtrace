export const INSUFFICIENT_STUDIO_FUNDS =
  "Your wallet does not have enough GenLayer Studio funds to submit this verification.";

export function canCoverFee(balanceWei: bigint, feeWei: bigint): boolean {
  return feeWei >= BigInt(0) && balanceWei >= feeWei;
}
