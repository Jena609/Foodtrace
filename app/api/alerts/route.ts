import { logServerError } from "@/lib/db/log";
import { DEMO_ITEMS } from "@/lib/inventory/demo";
import { inventorySummary } from "@/lib/inventory/service";
import { alertsFor, deriveInventoryStatus } from "@/lib/inventory/status";
import { apiError, apiOk } from "@/lib/http";
import { requireSignature } from "@/lib/security/actor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("demo") === "1") {
    const now = new Date();
    const items = DEMO_ITEMS.map((item) => ({
      id: item.id,
      productName: item.productName,
      expirationDate: item.expirationDate,
      status: item.status === "expired" ? "expired" as const : deriveInventoryStatus({ expirationDate: item.expirationDate, verificationStatus: null }, now),
    }));
    return apiOk({
      demo: true,
      alerts: alertsFor(items),
      notice: "DEMO DATA. These alerts come from the fictional sample inventory.",
    });
  }
  const signature = await requireSignature(request, "alerts.read", {});
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  try {
    const summary = await inventorySummary(signature.wallet);
    if (!summary) return apiOk({ demo: false, alerts: [], business: null });
    return apiOk({ demo: false, alerts: summary.alerts, business: summary.business });
  } catch (error) {
    logServerError("alerts.read", error);
    return apiError(503, "database_unavailable", "Alerts could not be read. Check the database and try again.");
  }
}
