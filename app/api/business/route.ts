import { createBusiness } from "@/lib/inventory/service";
import { apiError, apiOk, fromZod, readJson } from "@/lib/http";
import { requireSignature, sessionUserId } from "@/lib/security/actor";
import { businessSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json = await readJson(request);
  if (!json.ok) return json.response;
  const parsed = businessSchema.safeParse(json.body);
  if (!parsed.success) return fromZod(parsed.error);
  const signature = await requireSignature(request, "business.create", json.body);
  if (!signature.ok) return apiError(401, "unauthorized", signature.error);
  const userId = await sessionUserId(request);
  const business = await createBusiness(signature.wallet, userId, parsed.data.name, parsed.data.region);
  if (userId) await prismaLink(userId, signature.wallet);
  return apiOk({
    business: { id: business.id, name: business.name, region: business.region, createdAt: business.createdAt.toISOString() },
  });
}

async function prismaLink(userId: string, wallet: string) {
  const { prisma } = await import("@/lib/db/client");
  await prisma.user.update({ where: { id: userId }, data: { walletAddress: wallet.toLowerCase(), role: "business" } }).catch(() => undefined);
}
