import type { ProductSearchInput, RecallRecordInput } from "@/lib/types";

export interface RecallSourceAdapter {
  name: string;
  region: string;
  searchProduct(input: ProductSearchInput): Promise<RecallRecordInput[]>;
}

export class SourceError extends Error {
  readonly code: "timeout" | "malformed" | "invalid_url" | "http";

  constructor(code: SourceError["code"], message: string) {
    super(message);
    this.name = "SourceError";
    this.code = code;
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SourceError("timeout", `${label} timed out`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
