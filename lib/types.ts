export const VERDICT_STATUSES = [
  "RECALL_FOUND",
  "NO_MATCHING_RECALL_FOUND",
  "EXPIRED",
  "CONFLICTING_INFORMATION",
  "UNABLE_TO_VERIFY",
] as const;

export type VerdictStatus = (typeof VERDICT_STATUSES)[number];

export type Confidence = "high" | "medium" | "low";

export type RecordKind = "recall" | "clearance" | "context";

export type FinalizationStatus =
  | "preliminary"
  | "mock"
  | "submitted"
  | "pending"
  | "finalized"
  | "disputed"
  | "inconclusive"
  | "failed"
  | "unavailable";

export interface ProductSearchInput {
  barcode: string;
  productName: string;
  brand: string;
  lotNumber: string;
  expirationDate: string;
  region: string;
}

export interface RecallRecordInput {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sourcePriority: number;
  productName: string;
  brand: string;
  barcode: string;
  lotNumbers: string[];
  recallReason: string;
  recallDate: string;
  geographicScope: string;
  rawEvidence: string;
  retrievedAt: string;
  isDemoData: boolean;
  recordKind: RecordKind;
  region: string;
}

export interface SourceRun {
  name: string;
  region: string;
  ok: boolean;
  skipped?: boolean;
  demo?: boolean;
  error?: string;
  detail?: string;
}

export interface MatchDecision {
  status: VerdictStatus;
  confidence: Confidence;
  reasoningSummary: string;
  matchedCriteria: string[];
  matchedRecordIds: string[];
  stale: boolean;
  sourcesChecked: SourceRun[];
}
