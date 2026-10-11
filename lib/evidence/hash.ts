import { createHash } from "node:crypto";
import { canonicalJson } from "@/lib/evidence/canonical";

export { canonicalJson };

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function evidenceHash(value: unknown): string {
  return `0x${sha256Hex(canonicalJson(value))}`;
}
