import { UNAVAILABLE_MESSAGE } from "@/lib/genlayer/config";
import { createStudioClient } from "@/lib/genlayer/sdk";

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function hashFrom(value: unknown): `0x${string}` | null {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)) return value as `0x${string}`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["hash", "transactionHash", "txHash"]) {
      const found = hashFrom(record[key]);
      if (found) return found;
    }
  }
  return null;
}

function stringArgs(args: readonly unknown[]): string[] {
  if (args.every((arg) => typeof arg === "string")) return args as string[];
  throw new Error(UNAVAILABLE_MESSAGE);
}

export async function writeStudioContract(input: {
  provider: Eip1193Provider;
  account: `0x${string}`;
  contractAddress: `0x${string}`;
  method: string;
  args: readonly unknown[];
}): Promise<`0x${string}`> {
  const client = await createStudioClient({ account: input.account, provider: input.provider });
  const call = {
    address: input.contractAddress,
    functionName: input.method,
    args: stringArgs(input.args),
  };
  const estimate = await client.estimateTransactionFeesForWrite(call);
  const result = await client.writeContract({
    ...call,
    fees: {
      distribution: estimate.distribution,
      feeValue: estimate.feeValue,
      ...(estimate.messageAllocations ? { messageAllocations: estimate.messageAllocations } : {}),
    },
  });
  const hash = hashFrom(result);
  if (!hash) throw new Error("The wallet did not return a transaction id. Nothing was marked finalized.");
  return hash;
}
