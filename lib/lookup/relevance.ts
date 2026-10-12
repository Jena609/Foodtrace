import { normalizeBarcode, normalizeLot, normalizeName } from "@/lib/matching/engine";
import type { ProductSearchInput, RecallRecordInput } from "@/lib/types";

export function evidenceForResult(input: ProductSearchInput, records: RecallRecordInput[], matchedIds: string[]): RecallRecordInput[] {
  const barcode = normalizeBarcode(input.barcode);
  const lot = normalizeLot(input.lotNumber);
  const name = normalizeName(input.productName);
  const matched = new Set(matchedIds);
  return records.filter((record) => {
    if (matched.has(record.id)) return true;
    const sameBarcode = Boolean(barcode) && normalizeBarcode(record.barcode) === barcode;
    const sameLot = Boolean(lot) && record.lotNumbers.some((item) => normalizeLot(item) === lot);
    const sameName = Boolean(name) && normalizeName(record.productName) === name;
    return sameBarcode || sameLot || sameName;
  });
}
