import type { Appeal, EvidenceRecord, ProductLookup, RecallRecord, VerificationResult } from "@prisma/client";
import { FINALIZATION_COPY, SAFETY_DISCLAIMER, STATUS_COPY } from "@/lib/copy";
import type { Confidence, FinalizationStatus, MatchDecision, ProductSearchInput, SourceRun, VerdictStatus } from "@/lib/types";
import type { PublicAppeal, PublicReport } from "@/lib/reports/public-report";

export interface LookupRecord extends ProductLookup {
  evidence: EvidenceRecord[];
  recalls: RecallRecord[];
  result: (VerificationResult & { appeals: Appeal[] }) | null;
}

export interface EvidenceView {
  id: string;
  sourceName: string;
  sourceUrl: string;
  evidenceText: string;
  evidenceHash: string;
  sourcePriority: number;
  retrievedAt: string;
  matched: boolean;
  recordKind: string;
  matchCriteria: string[];
  demo: boolean;
}

export interface LookupView {
  id: string;
  createdAt: string;
  input: ProductSearchInput;
  status: VerdictStatus;
  confidence: Confidence;
  reasoningSummary: string;
  matchedCriteria: string[];
  sourcesChecked: SourceRun[];
  finalizationStatus: FinalizationStatus;
  finalizationDetail: string;
  isMock: boolean;
  genlayerTransactionId: string;
  genlayerEvaluationId: string;
  proposedEvaluationId: string;
  evidenceHash: string;
  evaluatedAt: string;
  resultId: string;
  evidence: EvidenceView[];
  appeals: PublicAppeal[];
  disclaimer: string;
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function displayedVerdict(result: { status: string; reasoningSummary: string; preliminaryStatus: string; preliminarySummary: string; finalizationStatus: string; isMock: boolean }) {
  const finalized = result.finalizationStatus === "finalized" && !result.isMock;
  const status = (finalized ? result.status : result.preliminaryStatus) as VerdictStatus;
  return {
    status,
    confidence: "low" as Confidence,
    reasoningSummary: finalized ? result.reasoningSummary : result.preliminarySummary,
    label: STATUS_COPY[status]?.label ?? status,
    finalizationDetail: FINALIZATION_COPY[(result.finalizationStatus as FinalizationStatus) || "preliminary"],
  };
}

export function toLookupView(row: LookupRecord): LookupView | null {
  if (!row.result) return null;
  const shown = displayedVerdict(row.result);
  const appeals: PublicAppeal[] = row.result.appeals
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((appeal) => ({
      id: appeal.id,
      reason: appeal.reason,
      newEvidence: appeal.newEvidence,
      explanation: appeal.explanation,
      status: appeal.status,
      outcomeStatus: appeal.outcomeStatus,
      outcomeSummary: appeal.outcomeSummary,
      genlayerTransactionId: appeal.genlayerTransactionId,
      isMock: appeal.isMock,
      createdAt: appeal.createdAt.toISOString(),
      resolvedAt: appeal.resolvedAt?.toISOString() ?? null,
    }));
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    input: {
      barcode: row.barcode,
      productName: row.productName,
      brand: row.brand,
      lotNumber: row.lotNumber,
      expirationDate: row.expirationDate,
      region: row.region,
    },
    status: shown.status,
    confidence: row.result.confidence as Confidence,
    reasoningSummary: shown.reasoningSummary,
    matchedCriteria: parseJson<string[]>(row.result.matchedCriteria, []),
    sourcesChecked: parseJson<SourceRun[]>(row.result.sourcesChecked, []),
    finalizationStatus: row.result.finalizationStatus as FinalizationStatus,
    finalizationDetail: shown.finalizationDetail,
    isMock: row.result.isMock,
    genlayerTransactionId: row.result.genlayerTransactionId,
    genlayerEvaluationId: row.result.genlayerEvaluationId,
    proposedEvaluationId: row.result.proposedEvaluationId,
    evidenceHash: row.result.evidenceHash,
    evaluatedAt: row.result.evaluatedAt.toISOString(),
    resultId: row.result.id,
    evidence: row.evidence.map((item) => ({
      id: item.id,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      evidenceText: item.evidenceText,
      evidenceHash: item.evidenceHash,
      sourcePriority: item.sourcePriority,
      retrievedAt: item.retrievedAt.toISOString(),
      matched: item.matched,
      recordKind: item.recordKind,
      matchCriteria: parseJson<string[]>(item.matchCriteria, []),
      demo: row.recalls.find((recall) => recall.sourceUrl === item.sourceUrl && recall.sourceName === item.sourceName)?.isDemoData ?? item.evidenceText.includes("Demo: yes"),
    })),
    appeals,
    disclaimer: SAFETY_DISCLAIMER,
  };
}

export function toPublicReport(view: LookupView): PublicReport {
  return {
    reportId: view.id,
    createdAt: view.createdAt,
    product: view.input,
    searchParameters: view.input,
    status: view.status,
    confidence: view.confidence,
    reasoningSummary: view.reasoningSummary,
    matchedCriteria: view.matchedCriteria,
    finalizationStatus: view.finalizationStatus,
    isMock: view.isMock,
    genlayerTransactionId: view.genlayerTransactionId,
    genlayerEvaluationId: view.genlayerEvaluationId,
    evidenceHash: view.evidenceHash,
    evaluatedAt: view.evaluatedAt,
    sources: view.evidence.map((item) => ({
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      evidenceText: item.evidenceText,
      evidenceHash: item.evidenceHash,
      sourcePriority: item.sourcePriority,
      retrievedAt: item.retrievedAt,
      matched: item.matched,
      recordKind: item.recordKind,
      matchCriteria: item.matchCriteria,
    })),
    appeals: view.appeals,
    disclaimer: view.disclaimer,
  };
}

export function decisionFromView(view: LookupView): MatchDecision {
  return {
    status: view.status,
    confidence: view.confidence,
    reasoningSummary: view.reasoningSummary,
    matchedCriteria: view.matchedCriteria,
    matchedRecordIds: view.evidence.filter((item) => item.matched).map((item) => item.id),
    stale: view.matchedCriteria.includes("stale_evidence"),
    sourcesChecked: view.sourcesChecked,
  };
}
