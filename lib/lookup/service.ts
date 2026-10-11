import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { evidenceHash } from "@/lib/evidence/hash";
import { formatEvidenceText } from "@/lib/evidence/format";
import { resolveGenLayerConfig } from "@/lib/genlayer/config";
import { decideMatch } from "@/lib/matching/engine";
import { collectRecallRecords } from "@/lib/sources/adapters";
import type { ProductSearchInput, RecallRecordInput } from "@/lib/types";
import { toLookupView, type LookupRecord, type LookupView } from "@/lib/lookup/view";

function nid(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

const include = {
  evidence: true,
  recalls: true,
  result: { include: { appeals: { orderBy: { createdAt: "asc" as const } } } },
} as const;

export async function getLookup(id: string): Promise<LookupView | null> {
  const row = await prisma.productLookup.findUnique({ where: { id }, include });
  if (!row) return null;
  return toLookupView(row as LookupRecord);
}

export async function createLookup(input: ProductSearchInput, userId: string | null): Promise<LookupView> {
  const collected = await collectRecallRecords(input);
  const now = new Date();
  const decision = decideMatch(input, collected.records, collected.sources, now);
  const gen = resolveGenLayerConfig(process.env);
  const mock = gen.mode === "mock";
  const lookupId = nid("lk");
  const resultId = nid("vr");
  const evidenceRows = collected.records.map((record) => evidenceRow(lookupId, record, decision.matchedRecordIds.includes(record.id), decision.matchedCriteria));
  const hash = evidenceHash({
    input,
    evidence: evidenceRows.map((row) => row.evidenceHash),
    status: decision.status,
    criteria: decision.matchedCriteria,
  });

  await prisma.productLookup.create({
    data: {
      id: lookupId,
      userId,
      barcode: input.barcode,
      productName: input.productName,
      brand: input.brand,
      lotNumber: input.lotNumber,
      expirationDate: input.expirationDate,
      region: input.region,
      status: decision.status,
      recalls: { create: collected.records.map((record) => recallRow(record)) },
      evidence: { create: evidenceRows.map((row) => {
        const { lookupId: storedLookupId, ...rest } = row;
        void storedLookupId;
        return rest;
      }) },
      result: {
        create: {
          id: resultId,
          status: decision.status,
          confidence: decision.confidence,
          reasoningSummary: decision.reasoningSummary,
          matchedCriteria: JSON.stringify(decision.matchedCriteria),
          sourcesChecked: JSON.stringify(decision.sourcesChecked),
          preliminaryStatus: decision.status,
          preliminarySummary: decision.reasoningSummary,
          evidenceHash: hash,
          evaluatedAt: now,
          isMock: mock,
          finalizationStatus: mock ? "mock" : "preliminary",
        },
      },
    },
  });

  const view = await getLookup(lookupId);
  if (!view) throw new Error("The lookup could not be read after it was saved.");
  return view;
}

function recallRow(record: RecallRecordInput) {
  return {
    id: nid("rr"),
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    productName: record.productName,
    brand: record.brand,
    barcode: record.barcode,
    lotNumbers: JSON.stringify(record.lotNumbers),
    recallReason: record.recallReason,
    recallDate: record.recallDate,
    geographicScope: record.geographicScope,
    rawEvidence: record.rawEvidence,
    retrievedAt: parsedDate(record.retrievedAt),
    isDemoData: record.isDemoData,
    sourcePriority: record.sourcePriority,
    recordKind: record.recordKind,
    region: record.region,
  };
}

function evidenceRow(lookupId: string, record: RecallRecordInput, matched: boolean, criteria: string[]) {
  const evidenceText = formatEvidenceText({
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    sourcePriority: record.sourcePriority,
    recordKind: record.recordKind,
    productName: record.productName,
    brand: record.brand,
    barcode: record.barcode,
    lotNumbers: record.lotNumbers,
    recallReason: record.recallReason,
    retrievedAt: record.retrievedAt,
    geographicScope: record.geographicScope,
    isDemoData: record.isDemoData,
    evidenceText: record.rawEvidence,
  });
  return {
    id: nid("ev"),
    lookupId,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    evidenceText,
    evidenceHash: evidenceHash(evidenceText),
    sourcePriority: record.sourcePriority,
    retrievedAt: parsedDate(record.retrievedAt),
    matched,
    recordKind: record.recordKind,
    matchCriteria: JSON.stringify(matched ? criteria : []),
  };
}

function parsedDate(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function listHistory(userId: string) {
  const rows = await prisma.productLookup.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { result: { include: { appeals: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    productName: row.productName,
    brand: row.brand,
    barcode: row.barcode,
    lotNumber: row.lotNumber,
    status: row.result?.finalizationStatus === "finalized" && !row.result.isMock ? row.result.status : row.result?.preliminaryStatus ?? row.status,
    finalizationStatus: row.result?.finalizationStatus ?? "preliminary",
    isMock: row.result?.isMock ?? false,
    genlayerTransactionId: row.result?.genlayerTransactionId ?? "",
    appealCount: row.result?.appeals.length ?? 0,
    reportHref: `/report/${row.id}`,
    resultHref: `/results/${row.id}`,
  }));
}
