import { isExpiredDate } from "@/lib/matching/engine";

export type InventoryStatus =
  | "unverified"
  | "recall_found"
  | "no_matching_recall"
  | "expired"
  | "conflicting"
  | "unable_to_verify"
  | "expiring_soon";

const EXPIRING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isExpiringSoon(expirationDate: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) return false;
  if (isExpiredDate(expirationDate, now)) return false;
  const [year, month, day] = expirationDate.split("-").map(Number);
  const expiry = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return expiry - today <= EXPIRING_WINDOW_MS;
}

export function deriveInventoryStatus(
  item: { expirationDate: string; verificationStatus: string | null },
  now: Date,
): InventoryStatus {
  if (item.verificationStatus === "RECALL_FOUND") return "recall_found";
  if (item.verificationStatus === "CONFLICTING_INFORMATION") return "conflicting";
  if (isExpiredDate(item.expirationDate, now)) return "expired";
  if (isExpiringSoon(item.expirationDate, now)) return "expiring_soon";
  if (item.verificationStatus === "UNABLE_TO_VERIFY") return "unable_to_verify";
  if (item.verificationStatus === "NO_MATCHING_RECALL_FOUND") return "no_matching_recall";
  if (item.verificationStatus === "EXPIRED") return "expired";
  return "unverified";
}

export interface InventoryAlert {
  itemId: string;
  productName: string;
  kind: "recall" | "expiration" | "expiring" | "unverified" | "conflict" | "unable";
  title: string;
  detail: string;
}

export function alertsFor(
  items: Array<{ id: string; productName: string; status: InventoryStatus; expirationDate: string }>,
): InventoryAlert[] {
  return items.flatMap((item): InventoryAlert[] => {
    if (item.status === "recall_found") {
      return [{ itemId: item.id, productName: item.productName, kind: "recall" as const, title: "Recall alert", detail: "A check reported recall information for this item." }];
    }
    if (item.status === "expired") {
      return [{ itemId: item.id, productName: item.productName, kind: "expiration" as const, title: "Expired", detail: item.expirationDate ? `Expiration date ${item.expirationDate} has passed.` : "Marked expired." }];
    }
    if (item.status === "expiring_soon") {
      return [{ itemId: item.id, productName: item.productName, kind: "expiring" as const, title: "Expiring soon", detail: `Expiration date ${item.expirationDate} is within 14 days.` }];
    }
    if (item.status === "conflicting") {
      return [{ itemId: item.id, productName: item.productName, kind: "conflict" as const, title: "Conflicting information", detail: "The last check found conflicting source information." }];
    }
    if (item.status === "unable_to_verify") {
      return [{ itemId: item.id, productName: item.productName, kind: "unable" as const, title: "Unable to verify", detail: "The last check could not verify this item." }];
    }
    if (item.status === "unverified") {
      return [{ itemId: item.id, productName: item.productName, kind: "unverified" as const, title: "Not checked yet", detail: "This item does not have a completed check." }];
    }
    return [];
  });
}
