import { z } from "zod";
import { cleanText, isValidCalendarDate } from "@/lib/security/sanitize";
import { assertPublicHttpsUrl } from "@/lib/security/url";

const text = (max: number) => z.string().optional().transform((value) => cleanText(value ?? "", max));

export const productSearchSchema = z
  .object({
    barcode: text(32),
    productName: text(160),
    brand: text(120),
    lotNumber: text(64),
    expirationDate: text(32),
    region: text(80),
  })
  .superRefine((value, context) => {
    if (value.barcode && !/^\d{8,14}$/.test(value.barcode)) {
      context.addIssue({ code: "custom", path: ["barcode"], message: "Enter a barcode of 8 to 14 digits, or leave it blank." });
    }
    if (value.expirationDate && !isValidCalendarDate(value.expirationDate)) {
      context.addIssue({ code: "custom", path: ["expirationDate"], message: "Enter an expiration date as YYYY-MM-DD." });
    }
    if (!value.barcode && !value.productName && !value.lotNumber) {
      context.addIssue({
        code: "custom",
        path: ["productName"],
        message: "Enter a barcode, product name, or lot number.",
      });
    }
  });

export const appealSchema = z
  .object({
    lookupId: z.string().min(8).max(80),
    reason: z.enum([
      "incorrect_match",
      "new_evidence",
      "incorrect_lot",
      "source_unavailable",
      "conflicting_official_sources",
      "later_manufacturer_notice",
    ]),
    newEvidenceUrl: z.string().optional().transform((value) => cleanText(value ?? "", 400)),
    explanation: z.string().transform((value) => cleanText(value, 2000)),
  })
  .superRefine((value, context) => {
    if (value.explanation.length < 12) {
      context.addIssue({ code: "custom", path: ["explanation"], message: "Explain the appeal in at least 12 characters." });
    }
    if (value.newEvidenceUrl && !assertPublicHttpsUrl(value.newEvidenceUrl)) {
      context.addIssue({ code: "custom", path: ["newEvidenceUrl"], message: "Evidence links must be public https URLs." });
    }
  });

export const businessSchema = z.object({
  name: z.string().transform((value) => cleanText(value, 120)).pipe(z.string().min(2, "Enter the business name.")),
  region: z.string().transform((value) => cleanText(value, 80)).pipe(z.string().min(2, "Enter a region.")),
});

const inventoryObject = z.object({
  productName: z.string().transform((value) => cleanText(value, 160)).pipe(z.string().min(2, "Enter a product name.")),
  brand: text(120),
  barcode: text(32),
  lotNumber: text(64),
  expirationDate: text(32),
  quantity: z.coerce.number().int().min(0).max(1_000_000),
  supplier: text(160),
});

function refineInventory(value: { barcode?: string; expirationDate?: string }, context: z.RefinementCtx) {
  if (value.barcode && !/^\d{8,14}$/.test(value.barcode)) {
    context.addIssue({ code: "custom", path: ["barcode"], message: "Enter a barcode of 8 to 14 digits, or leave it blank." });
  }
  if (value.expirationDate && !isValidCalendarDate(value.expirationDate)) {
    context.addIssue({ code: "custom", path: ["expirationDate"], message: "Enter an expiration date as YYYY-MM-DD." });
  }
}

export const inventorySchema = inventoryObject.superRefine(refineInventory);
export const inventoryPatchSchema = inventoryObject.partial().superRefine(refineInventory);

export const emailSchema = z.object({
  email: z.string().trim().email().max(160).or(z.literal("")),
  defaultRegion: text(80),
  emailAlerts: z.boolean().optional().default(false),
});

export const adminTokenSchema = z.object({
  token: z.string().min(8).max(200),
});

export function zodErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "The request is not valid.";
}
