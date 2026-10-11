import { deleteInventoryItem, updateInventoryItem } from "@/lib/inventory/service";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { requireSignature } from "@/lib/security/actor";
import { inventoryPatchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = inventoryPatchSchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  const signature = await requireSignature(request, "inventory.update", json.body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  const item = await updateInventoryItem(signature.wallet, id, parsed.data);
  if (!item) return apiError(404, "not_found", "That inventory item was not found for this wallet.");
  return apiOk({ item });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const signature = await requireSignature(request, "inventory.delete", json.body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  if (!json.body || typeof json.body !== "object" || (json.body as { id?: string }).id !== id) {
    return apiError(400, "invalid_input", "The signed item does not match this request.");
  }
  const removed = await deleteInventoryItem(signature.wallet, id);
  if (!removed) return apiError(404, "not_found", "That inventory item was not found for this wallet.");
  return apiOk({ removed: true });
}
