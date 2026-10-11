import { decideMatch } from "@/lib/matching/engine";
import type { MatchDecision, ProductSearchInput, RecallRecordInput, SourceRun } from "@/lib/types";

export interface StoredAppeal {
  id: string;
  verificationResultId: string;
  reason: string;
  newEvidence: string;
  explanation: string;
  status: string;
  outcomeStatus: string;
  outcomeSummary: string;
  createdAt: string;
}

export function reviewAppeal(input: {
  original: MatchDecision;
  search: ProductSearchInput;
  records: RecallRecordInput[];
  sources: SourceRun[];
  now: Date;
}): { original: MatchDecision; outcome: MatchDecision } {
  const outcome = decideMatch(input.search, input.records, input.sources, input.now);
  return { original: input.original, outcome };
}

export function appendAppeal<T extends { status: string; reasoningSummary: string }>(result: T, appeals: StoredAppeal[], appeal: StoredAppeal): { result: T; appeals: StoredAppeal[] } {
  return { result, appeals: [...appeals, appeal] };
}
