import type { FinalizationStatus, VerdictStatus } from "@/lib/types";

export interface PublicEvidence {
  sourceName: string;
  sourceUrl: string;
  evidenceText: string;
  evidenceHash: string;
  sourcePriority: number;
  retrievedAt: string;
  matched: boolean;
  recordKind: string;
  matchCriteria: string[];
}

export interface PublicAppeal {
  id: string;
  reason: string;
  newEvidence: string;
  explanation: string;
  status: string;
  outcomeStatus: string;
  outcomeSummary: string;
  genlayerTransactionId: string;
  isMock: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface PublicReport {
  reportId: string;
  createdAt: string;
  product: {
    productName: string;
    brand: string;
    barcode: string;
    lotNumber: string;
    expirationDate: string;
    region: string;
  };
  searchParameters: {
    barcode: string;
    productName: string;
    brand: string;
    lotNumber: string;
    expirationDate: string;
    region: string;
  };
  status: VerdictStatus;
  confidence: string;
  reasoningSummary: string;
  matchedCriteria: string[];
  finalizationStatus: FinalizationStatus;
  isMock: boolean;
  genlayerTransactionId: string;
  genlayerEvaluationId: string;
  evidenceHash: string;
  evaluatedAt: string;
  sources: PublicEvidence[];
  appeals: PublicAppeal[];
  disclaimer: string;
}

const PRIVATE_KEYS = ["email", "walletAddress", "supplier", "quantity", "ownerWalletAddress", "sessionSecret"];

export function toPublicReport(input: PublicReport): PublicReport {
  return {
    reportId: input.reportId,
    createdAt: input.createdAt,
    product: { ...input.product },
    searchParameters: { ...input.searchParameters },
    status: input.status,
    confidence: input.confidence,
    reasoningSummary: input.reasoningSummary,
    matchedCriteria: [...input.matchedCriteria],
    finalizationStatus: input.finalizationStatus,
    isMock: input.isMock,
    genlayerTransactionId: input.genlayerTransactionId,
    genlayerEvaluationId: input.genlayerEvaluationId,
    evidenceHash: input.evidenceHash,
    evaluatedAt: input.evaluatedAt,
    sources: input.sources.map((source) => ({ ...source, matchCriteria: [...source.matchCriteria] })),
    appeals: input.appeals.map((appeal) => ({ ...appeal })),
    disclaimer: input.disclaimer,
  };
}

export function reportHasPrivateFields(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return PRIVATE_KEYS.some((key) => key in record && record[key] !== undefined && record[key] !== "");
}
