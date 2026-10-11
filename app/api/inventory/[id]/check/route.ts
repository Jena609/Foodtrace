import { checkInventoryItem } from "@/lib/inventory/service";
import { apiError, apiOk, readJson } from "@/lib/http";
import { requireSignature, sessionUserId } from "@/lib/security/actor";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const signature = await requireSignature(request, "inventory.check", json.body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  if (!json.body || typeof json.body !== "object" || (json.body as { id?: string }).id !== id) {
    return apiError(400, "invalid_input", "The signed item does not match this request.");
  }
  const userId = await sessionUserId(request);
  const checked = await checkInventoryItem(signature.wallet, id, userId);
  if (!checked) return apiError(404, "not_found", "That inventory item was not found for this wallet.");
  return apiOk({ item: checked.item, lookupId: checked.lookupId });
}
