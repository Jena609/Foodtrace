export function foodTraceMessage(input: {
  action: string;
  wallet: string;
  nonce: string;
  timestamp: string;
  bodyHash: string;
}): string {
  return [
    "FoodTrace",
    `action:${input.action}`,
    `wallet:${input.wallet.toLowerCase()}`,
    `nonce:${input.nonce}`,
    `timestamp:${input.timestamp}`,
    `body:${input.bodyHash}`,
  ].join("\n");
}
