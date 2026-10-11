import type { MatchDecision, ProductSearchInput, RecallRecordInput, SourceRun, VerdictStatus } from "@/lib/types";

export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const STOPWORDS = new Set([
  "oz", "ounce", "ounces", "lb", "lbs", "g", "kg", "ml", "l", "pack", "ct", "count",
  "the", "a", "an", "of", "and", "size", "net", "wt", "weight",
]);

export function normalizeBarcode(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeLot(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function nameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token && !STOPWORDS.has(token) && !/^\d+$/.test(token));
}

export function jaccard(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function semanticMatch(left: string, right: string): boolean {
  const a = nameTokens(left);
  const b = nameTokens(right);
  if (a.length === 0 || b.length === 0) return false;
  if (jaccard(a, b) >= 0.55) return true;
  const short = a.length <= b.length ? a : b;
  const long = new Set(a.length <= b.length ? b : a);
  const significant = short.filter((token) => token.length > 2);
  return significant.length >= 2 && significant.every((token) => long.has(token));
}

export function tokensEqual(left: string, right: string): boolean {
  const a = nameTokens(left).slice().sort();
  const b = nameTokens(right).slice().sort();
  return a.length > 0 && a.length === b.length && a.every((token, index) => token === b[index]);
}

export type BrandRelation = "match" | "mismatch" | "unknown";

export function brandsCompatible(left: string, right: string): BrandRelation {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return "unknown";
  if (a === b || tokensEqual(left, right) || semanticMatch(left, right)) return "match";
  const initials = b.split(" ").map((part) => part[0] ?? "").join("");
  const compact = a.replace(/\s/g, "");
  if (compact.length >= 2 && compact === initials) return "match";
  const reverse = a.split(" ").map((part) => part[0] ?? "").join("");
  if (b.replace(/\s/g, "").length >= 2 && b.replace(/\s/g, "") === reverse) return "match";
  return "mismatch";
}

export function isExpiredDate(value: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const expiry = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return expiry < today;
}

export function isStaleRetrieval(retrievedAt: string, now: Date): boolean {
  const parsed = Date.parse(retrievedAt);
  if (Number.isNaN(parsed)) return true;
  return now.getTime() - parsed > STALE_AFTER_MS;
}

export function prepareRecords(records: RecallRecordInput[]): { records: RecallRecordInput[]; collapsed: number } {
  const grouped = new Map<string, RecallRecordInput>();
  let collapsed = 0;
  for (const record of records) {
    const key = [
      record.sourceName.trim().toLowerCase(),
      record.recordKind,
      normalizeName(record.productName),
      normalizeName(record.brand),
      normalizeBarcode(record.barcode),
      record.lotNumbers.map(normalizeLot).filter(Boolean).sort().join(","),
      normalizeName(record.recallReason),
    ].join("|");
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, record);
      continue;
    }
    collapsed += 1;
    if (Date.parse(record.retrievedAt) > Date.parse(existing.retrievedAt)) grouped.set(key, record);
  }
  return { records: [...grouped.values()], collapsed };
}

interface Annotation {
  record: RecallRecordInput;
  level: number;
  criterion: string;
  missingLot: boolean;
  stale: boolean;
  noteOnly: boolean;
  lotBrandClash: boolean;
}

function confidenceFor(level: number, stale: boolean, priority: number): MatchDecision["confidence"] {
  if (stale || priority >= 5) return "low";
  if (level >= 4 && priority <= 2) return "high";
  if (level >= 2) return "medium";
  return "low";
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sentence(status: VerdictStatus, now: Date, detail: string): string {
  const stamp = now.toISOString();
  if (status === "RECALL_FOUND") {
    return `Recall information was detected. ${detail}`.trim();
  }
  if (status === "CONFLICTING_INFORMATION") {
    return `The available sources contain conflicting information. ${detail}`.trim();
  }
  if (status === "UNABLE_TO_VERIFY") {
    return `We were unable to verify this product with the available data. ${detail}`.trim();
  }
  if (status === "EXPIRED") {
    return `The expiration date provided is before ${stamp.slice(0, 10)}. ${detail} No matching recall was found in the configured sources as of ${stamp}. This is not a determination that the product was safe before it expired.`.trim();
  }
  return `No matching recall was found in the configured sources as of ${stamp}. ${detail} This result is not a certification.`.trim();
}

function finish(
  status: VerdictStatus,
  confidence: MatchDecision["confidence"],
  criteria: string[],
  matched: Annotation[],
  sources: SourceRun[],
  now: Date,
  detail: string,
  stale: boolean,
): MatchDecision {
  return {
    status,
    confidence,
    reasoningSummary: sentence(status, now, detail),
    matchedCriteria: unique(criteria),
    matchedRecordIds: matched.map((item) => item.record.id),
    stale,
    sourcesChecked: sources,
  };
}

export function decideMatch(
  input: ProductSearchInput,
  incoming: RecallRecordInput[],
  sources: SourceRun[],
  now: Date,
): MatchDecision {
  const prepared = prepareRecords(incoming);
  const criteria = prepared.collapsed > 0 ? ["duplicate_collapsed"] : [];
  const barcode = normalizeBarcode(input.barcode);
  const lot = normalizeLot(input.lotNumber);
  const expired = isExpiredDate(input.expirationDate, now);
  const activeSources = sources.filter((source) => !source.skipped);
  const failed = activeSources.filter((source) => !source.ok);
  const liveSourceOk = activeSources.some((source) => source.ok && !source.demo);

  if (!barcode && !normalizeName(input.productName) && !lot) {
    return finish(
      "UNABLE_TO_VERIFY",
      "low",
      [...criteria, "missing_identifier"],
      [],
      sources,
      now,
      "A barcode, product name, or lot number is required.",
      false,
    );
  }

  const annotations: Annotation[] = [];
  for (const record of prepared.records) {
    const recordBarcode = normalizeBarcode(record.barcode);
    const recordLots = record.lotNumbers.map(normalizeLot).filter(Boolean);
    const barcodeEqual = Boolean(barcode && recordBarcode && barcode === recordBarcode);
    const barcodeConflict = Boolean(barcode && recordBarcode && barcode !== recordBarcode);
    const lotEqual = Boolean(lot && recordLots.includes(lot));
    const lotConflict = Boolean(lot && recordLots.length > 0 && !recordLots.includes(lot));
    const nameExact = Boolean(input.productName) && (normalizeName(input.productName) === normalizeName(record.productName) || tokensEqual(input.productName, record.productName));
    const brand = brandsCompatible(input.brand, record.brand);
    const stale = isStaleRetrieval(record.retrievedAt, now);
    const missingLot = !lot && recordLots.length > 0;
    const base = { record, stale, missingLot };

    if (barcodeEqual && lotEqual) {
      annotations.push({ ...base, level: 5, criterion: "exact_barcode_and_lot", noteOnly: false, lotBrandClash: false });
      continue;
    }
    if (lotEqual && (barcodeConflict || brand === "mismatch")) {
      annotations.push({ ...base, level: 0, criterion: "brand_mismatch", noteOnly: true, lotBrandClash: true, missingLot: false });
      continue;
    }
    if (lotEqual) {
      annotations.push({ ...base, level: 4, criterion: "exact_lot_number", noteOnly: false, lotBrandClash: false, missingLot: false });
      continue;
    }
    if (barcodeEqual && lotConflict) continue;
    if (barcode && !recordBarcode && !lotEqual) continue;
    if (barcodeEqual) {
      annotations.push({ ...base, level: 3, criterion: "exact_barcode", noteOnly: false, lotBrandClash: false });
      continue;
    }
    if (barcodeConflict) continue;
    if (nameExact && brand === "mismatch") {
      annotations.push({ ...base, level: 0, criterion: "brand_mismatch", noteOnly: true, lotBrandClash: false });
      continue;
    }
    if (nameExact && brand !== "mismatch" && !lotConflict) {
      annotations.push({ ...base, level: 2, criterion: "exact_product_name_and_brand", noteOnly: false, lotBrandClash: false });
      continue;
    }
    if (input.productName && semanticMatch(input.productName, record.productName) && !lotConflict) {
      if (brand === "mismatch") {
        annotations.push({ ...base, level: 0, criterion: "brand_mismatch", noteOnly: true, lotBrandClash: false });
        continue;
      }
      annotations.push({ ...base, level: 1, criterion: "semantic_product_name", noteOnly: false, lotBrandClash: false });
    }
  }

  let considered = annotations;
  const barcodeAnchored = prepared.records.some((record) => barcode && normalizeBarcode(record.barcode) === barcode);
  if (barcodeAnchored) {
    considered = considered.filter((item) => item.noteOnly || item.level >= 3 || normalizeBarcode(item.record.barcode) === barcode);
  }
  if (considered.some((item) => !item.noteOnly && item.level >= 4)) {
    considered = considered.filter((item) => item.noteOnly || item.level >= 4);
  }

  const recalls = considered.filter((item) => !item.noteOnly && item.record.recordKind === "recall" && item.level > 0);
  const clearances = considered.filter((item) => !item.noteOnly && item.record.recordKind === "clearance" && item.level > 0);
  const notes = considered.filter((item) => item.noteOnly);
  const bestRecall = recalls.slice().sort((a, b) => b.level - a.level || a.record.sourcePriority - b.record.sourcePriority)[0];
  const bestClearance = clearances.slice().sort((a, b) => b.level - a.level || a.record.sourcePriority - b.record.sourcePriority)[0];

  if (
    bestRecall &&
    bestClearance &&
    bestRecall.level >= 3 &&
    bestClearance.level >= 3 &&
    bestClearance.record.sourcePriority <= 3
  ) {
    const stale = bestRecall.stale || bestClearance.stale;
    return finish(
      "CONFLICTING_INFORMATION",
      "low",
      [...criteria, bestRecall.criterion, bestClearance.criterion, "conflicting_sources", ...(stale ? ["stale_evidence"] : [])],
      [bestRecall, bestClearance],
      sources,
      now,
      `${bestRecall.record.sourceName} and ${bestClearance.record.sourceName} do not agree for these identifiers.`,
      stale,
    );
  }

  if (bestRecall?.missingLot && !recalls.some((item) => !item.missingLot && item.level >= bestRecall.level)) {
    if (expired) {
      return finish(
        "EXPIRED",
        "low",
        [...criteria, "expired", "missing_lot", bestRecall.criterion],
        [bestRecall],
        sources,
        now,
        "A lot-specific record exists for this product, and no lot number was provided. A missing lot number is not evidence that a recall does not apply.",
        bestRecall.stale,
      );
    }
    return finish(
      "UNABLE_TO_VERIFY",
      "low",
      [...criteria, "missing_lot", bestRecall.criterion],
      [bestRecall],
      sources,
      now,
      "A lot-specific record exists for this product, and no lot number was provided. A missing lot number is not evidence that a recall does not apply.",
      bestRecall.stale,
    );
  }

  if (bestRecall) {
    const stale = bestRecall.stale;
    const extra = [
      bestRecall.criterion,
      ...(stale ? ["stale_evidence"] : []),
      ...(expired ? ["expired"] : []),
      ...(bestRecall.record.isDemoData ? ["demo_evidence"] : []),
    ];
    const detail = stale
      ? `The strongest match is ${bestRecall.criterion.replaceAll("_", " ")} from ${bestRecall.record.sourceName}. The retrieved evidence is stale and should be refreshed.`
      : `The strongest match is ${bestRecall.criterion.replaceAll("_", " ")} from ${bestRecall.record.sourceName}.`;
    return finish(
      "RECALL_FOUND",
      confidenceFor(bestRecall.level, stale, bestRecall.record.sourcePriority),
      [...criteria, ...extra],
      recalls.filter((item) => item.level === bestRecall.level),
      sources,
      now,
      detail,
      stale,
    );
  }

  if (notes.some((item) => item.lotBrandClash)) {
    return finish(
      "CONFLICTING_INFORMATION",
      "low",
      [...criteria, "brand_mismatch"],
      [],
      sources,
      now,
      "A lot number matched a record under a different brand or barcode. That record was not applied as a recall match.",
      false,
    );
  }

  if (failed.length > 0 && activeSources.every((source) => !source.ok)) {
    return finish(
      "UNABLE_TO_VERIFY",
      "low",
      [...criteria, "source_failure", ...(expired ? ["expired"] : [])],
      [],
      sources,
      now,
      "Every configured source failed or timed out.",
      false,
    );
  }

  if (failed.length > 0 && recalls.length === 0) {
    return finish(
      "UNABLE_TO_VERIFY",
      "low",
      [...criteria, "source_failure", ...(expired ? ["expired"] : []), ...(notes.some((item) => item.criterion === "brand_mismatch") ? ["brand_mismatch"] : [])],
      [],
      sources,
      now,
      "At least one configured source failed, so a missing recall cannot be treated as a completed check.",
      false,
    );
  }

  if (expired) {
    return finish(
      "EXPIRED",
      liveSourceOk ? "medium" : "low",
      [...criteria, "expired", ...(notes.some((item) => item.criterion === "brand_mismatch") ? ["brand_mismatch"] : [])],
      [],
      sources,
      now,
      notes.some((item) => item.criterion === "brand_mismatch")
        ? "A similar name under a different brand was not applied as a match."
        : "The date on the package is before today.",
      false,
    );
  }

  return finish(
    "NO_MATCHING_RECALL_FOUND",
    liveSourceOk ? "medium" : "low",
    [...criteria, ...(notes.some((item) => item.criterion === "brand_mismatch") ? ["brand_mismatch"] : [])],
    [],
    sources,
    now,
    notes.some((item) => item.criterion === "brand_mismatch")
      ? "A similar product name under a different brand was not applied as a match."
      : "The configured sources that responded did not contain a matching recall record.",
    false,
  );
}
