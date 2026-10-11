import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { alertsFor, deriveInventoryStatus } from "@/lib/inventory/status";
import { createLookup } from "@/lib/lookup/service";
import type { ProductSearchInput } from "@/lib/types";

function nid(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export async function businessForWallet(wallet: string) {
  return prisma.business.findFirst({ where: { ownerWalletAddress: wallet.toLowerCase() }, include: { items: { orderBy: { createdAt: "desc" } } } });
}

export async function createBusiness(wallet: string, userId: string | null, name: string, region: string) {
  const existing = await businessForWallet(wallet);
  if (existing) return existing;
  return prisma.business.create({
    data: { id: nid("biz"), ownerId: userId, ownerWalletAddress: wallet.toLowerCase(), name, region },
    include: { items: true },
  });
}

export async function addInventoryItem(wallet: string, input: {
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  supplier: string;
}) {
  const business = await businessForWallet(wallet);
  if (!business) return null;
  const status = deriveInventoryStatus({ expirationDate: input.expirationDate, verificationStatus: null }, new Date());
  return prisma.inventoryItem.create({
    data: {
      id: nid("inv"),
      businessId: business.id,
      productName: input.productName,
      brand: input.brand,
      barcode: input.barcode,
      lotNumber: input.lotNumber,
      expirationDate: input.expirationDate,
      quantity: input.quantity,
      supplier: input.supplier,
      status,
    },
  });
}

export async function updateInventoryItem(wallet: string, id: string, input: Partial<{
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  supplier: string;
}>) {
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { business: true } });
  if (!item || item.business.ownerWalletAddress !== wallet.toLowerCase()) return null;
  const expirationDate = input.expirationDate ?? item.expirationDate;
  const status = item.status === "unverified" || item.status === "expired" || item.status === "expiring_soon"
    ? deriveInventoryStatus({ expirationDate, verificationStatus: null }, new Date())
    : item.status;
  return prisma.inventoryItem.update({
    where: { id },
    data: { ...input, status },
  });
}

export async function deleteInventoryItem(wallet: string, id: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { business: true } });
  if (!item || item.business.ownerWalletAddress !== wallet.toLowerCase()) return false;
  await prisma.inventoryItem.delete({ where: { id } });
  return true;
}

export async function checkInventoryItem(wallet: string, id: string, userId: string | null) {
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { business: true } });
  if (!item || item.business.ownerWalletAddress !== wallet.toLowerCase()) return null;
  const search: ProductSearchInput = {
    barcode: item.barcode,
    productName: item.productName,
    brand: item.brand,
    lotNumber: item.lotNumber,
    expirationDate: item.expirationDate,
    region: item.business.region,
  };
  const lookup = await createLookup(search, userId);
  const status = deriveInventoryStatus({ expirationDate: item.expirationDate, verificationStatus: lookup.status }, new Date());
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { status, lastCheckedAt: new Date(), lastLookupId: lookup.id },
  });
  return { item: updated, lookupId: lookup.id };
}

export async function inventorySummary(wallet: string) {
  const business = await businessForWallet(wallet);
  if (!business) return null;
  const now = new Date();
  const items = business.items.map((item) => ({
    ...serializeItem(item),
    status: item.lastCheckedAt ? item.status : deriveInventoryStatus({ expirationDate: item.expirationDate, verificationStatus: null }, now),
  }));
  const alerts = alertsFor(items.map((item) => ({ id: item.id, productName: item.productName, status: item.status as never, expirationDate: item.expirationDate })));
  return {
    business: { id: business.id, name: business.name, region: business.region, createdAt: business.createdAt.toISOString() },
    items,
    counts: {
      active: items.length,
      recalls: items.filter((item) => item.status === "recall_found").length,
      expiring: items.filter((item) => item.status === "expiring_soon").length,
      expired: items.filter((item) => item.status === "expired").length,
      unverified: items.filter((item) => item.status === "unverified" || item.status === "unable_to_verify").length,
    },
    alerts,
  };
}

function serializeItem(item: {
  id: string;
  productName: string;
  brand: string;
  barcode: string;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  supplier: string;
  status: string;
  lastCheckedAt: Date | null;
  lastLookupId: string;
  createdAt: Date;
}) {
  return {
    id: item.id,
    productName: item.productName,
    brand: item.brand,
    barcode: item.barcode,
    lotNumber: item.lotNumber,
    expirationDate: item.expirationDate,
    quantity: item.quantity,
    supplier: item.supplier,
    status: item.status,
    lastCheckedAt: item.lastCheckedAt?.toISOString() ?? null,
    lastLookupId: item.lastLookupId,
    createdAt: item.createdAt.toISOString(),
    demo: false,
  };
}

export function toCsv(items: Array<Record<string, string | number | boolean | null>>) {
  const headers = ["productName", "brand", "barcode", "lotNumber", "expirationDate", "quantity", "supplier", "status", "lastCheckedAt"];
  const lines = [headers.join(",")];
  for (const item of items) {
    lines.push(headers.map((header) => `"${String(item[header] ?? "").replaceAll('"', '""')}"`).join(","));
  }
  return lines.join("\n");
}
