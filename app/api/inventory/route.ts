import { logServerError } from "@/lib/db/log";
import { DEMO_BUSINESS, DEMO_ITEMS } from "@/lib/inventory/demo";
import { addInventoryItem, inventorySummary, toCsv } from "@/lib/inventory/service";
import { alertsFor, deriveInventoryStatus } from "@/lib/inventory/status";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { requireSignature, sessionUserId } from "@/lib/security/actor";
import { inventorySchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("demo") === "1") {
    const now = new Date();
    const items = DEMO_ITEMS.map((item) => ({
      ...item,
      status: item.status === "expired" ? "expired" : deriveInventoryStatus({ expirationDate: item.expirationDate, verificationStatus: null }, now),
      lastCheckedAt: null,
      lastLookupId: "",
    }));
    return apiOk({
      demo: true,
      business: DEMO_BUSINESS,
      items,
      alerts: alertsFor(items.map((item) => ({ id: item.id, productName: item.productName, status: item.status as "expired" | "unverified" | "expiring_soon", expirationDate: item.expirationDate }))),
      notice: "DEMO DATA. These inventory rows are fictional and are not stored against a connected wallet.",
    });
  }
  const signature = await requireSignature(request, "inventory.read", {});
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  try {
    const summary = await inventorySummary(signature.wallet);
    if (url.searchParams.get("format") === "csv") {
      if (!summary) return apiError(404, "no_business", "Create a business profile before exporting inventory.");
      return new Response(toCsv(summary.items), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=foodtrace-inventory.csv" },
      });
    }
    return apiOk({ demo: false, summary });
  } catch (error) {
    logServerError("inventory.read", error);
    return apiError(503, "database_unavailable", "Inventory could not be read. Check the database and try again.");
  }
}

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = inventorySchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  const signature = await requireSignature(request, "inventory.create", json.body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  let item: Awaited<ReturnType<typeof addInventoryItem>>;
  try {
    item = await addInventoryItem(signature.wallet, parsed.data);
  } catch (error) {
    logServerError("inventory.create", error);
    return apiError(503, "database_unavailable", "Inventory could not be saved. Check the database and try again.");
  }
  if (!item) return apiError(409, "no_business", "Create a business profile before adding inventory.");
  await sessionUserId(request);
  return apiOk({ item });
}
