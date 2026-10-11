import { prisma } from "@/lib/db/client";
import { publicConfig } from "@/lib/genlayer/config";
import { apiError, apiOk } from "@/lib/http";
import { adminSessionValid } from "@/lib/security/actor";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.FOODTRACE_ADMIN_TOKEN?.trim()) {
    return apiError(503, "admin_unconfigured", "Set FOODTRACE_ADMIN_TOKEN before using the admin dashboard.");
  }
  if (!adminSessionValid(request)) return apiError(401, "unauthorized", "Admin sign-in is required.");
  const [lookups, users, businesses, appeals] = await Promise.all([
    prisma.productLookup.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { result: true } }),
    prisma.user.count(),
    prisma.business.count(),
    prisma.appeal.count(),
  ]);
  const counts = lookups.reduce<Record<string, number>>((acc, lookup) => {
    acc[lookup.status] = (acc[lookup.status] ?? 0) + 1;
    return acc;
  }, {});
  return apiOk({
    config: publicConfig(),
    totals: { users, businesses, appeals, recentLookups: lookups.length },
    recentStatusCounts: counts,
    lookups: lookups.map((lookup) => ({
      id: lookup.id,
      productName: lookup.productName,
      brand: lookup.brand,
      status: lookup.status,
      createdAt: lookup.createdAt.toISOString(),
      finalizationStatus: lookup.result?.finalizationStatus ?? "",
      isMock: lookup.result?.isMock ?? false,
      genlayerTransactionId: lookup.result?.genlayerTransactionId ?? "",
    })),
  });
}
