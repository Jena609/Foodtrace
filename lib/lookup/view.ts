import type { Appeal, EvidenceRecord, ProductLookup, RecallRecord, VerificationResult } from "@prisma/client";
import { FINALIZATION_COPY, SAFETY_DISCLAIMER, STATUS_COPY } from "@/lib/copy";
import { resolveGenLayerConfig } from "@/lib/genlayer/config";
import type { Confidence, FinalizationStatus, MatchDecision, ProductSearchInput, SourceRun, VerdictStatus } from "@/lib/types";
import type { PublicAppeal, PublicReport } from "@/lib/reports/public-report";
import { dataStatus, displayClassification, reviewStatus, sourceAgreement, type DataStatus, type DisplayClassification, type ReviewStatus } from "@/lib/verification/classification";

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
  submittedAt: string | null;
  finalizedAt: string | null;
  lastError: string;
  resultId: string;
  evidence: EvidenceView[];
  appeals: PublicAppeal[];
  disclaimer: string;
  classification: DisplayClassification;
  reviewStatus: ReviewStatus;
  dataStatus: DataStatus;
  sourceAgreement: string;
  classificationSource: "genlayer" | "foodtrace";
  genlayerNetwork: string;
  genlayerChainId: number | null;
  contractAddress: string;
  contractUrl: string;
  transactionUrl: string;
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
  const sourcesChecked = parseJson<SourceRun[]>(row.result.sourcesChecked, []);
  const evidence = row.evidence.map((item) => ({
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
  }));
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
    sourcesChecked,
    finalizationStatus: row.result.finalizationStatus as FinalizationStatus,
    finalizationDetail: shown.finalizationDetail,
    isMock: row.result.isMock,
    genlayerTransactionId: row.result.genlayerTransactionId,
    genlayerEvaluationId: row.result.genlayerEvaluationId,
    proposedEvaluationId: row.result.proposedEvaluationId,
    evidenceHash: row.result.evidenceHash,
    evaluatedAt: row.result.evaluatedAt.toISOString(),
    submittedAt: row.result.submittedAt?.toISOString() ?? null,
    finalizedAt: row.result.finalizedAt?.toISOString() ?? null,
    lastError: row.result.lastError,
    resultId: row.result.id,
    evidence,
    appeals,
    disclaimer: SAFETY_DISCLAIMER,
    ...verificationFields(shown.status, parseJson<string[]>(row.result.matchedCriteria, []), row.result.finalizationStatus, row.result.isMock, row.result.genlayerTransactionId, evidence, sourcesChecked),
  };
}

function verificationFields(
  status: VerdictStatus,
  criteria: string[],
  finalizationStatus: string,
  isMock: boolean,
  transactionId: string,
  evidence: Array<{ demo: boolean; matched: boolean; recordKind: string }>,
  sources: Array<{ demo?: boolean; skipped?: boolean }>,
) {
  const config = resolveGenLayerConfig(process.env);
  const finalized = finalizationStatus === "finalized" && !isMock;
  const contractUrl = config.studioReady ? `${config.explorerUrl}/address/${config.contractAddress}` : "";
  return {
    classification: displayClassification(status, criteria, evidence),
    reviewStatus: reviewStatus(finalizationStatus, isMock),
    dataStatus: dataStatus(evidence, sources),
    sourceAgreement: sourceAgreement(status, evidence),
    classificationSource: finalized ? "genlayer" as const : "foodtrace" as const,
    genlayerNetwork: config.studioReady ? config.networkName : "",
    genlayerChainId: config.studioReady ? config.chainId : null,
    contractAddress: config.studioReady ? config.contractAddress : "",
    contractUrl,
    transactionUrl: config.studioReady && transactionId ? `${config.explorerUrl}/tx/${transactionId}` : "",
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
