import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { ensureDatabase } from "@/lib/db/ensure";

const globalForPrisma = globalThis as unknown as { foodtracePrisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL?.trim() ?? "";
  if (!url) return new PrismaClient({ log: ["error"] });
  const adapter = new PrismaLibSQL({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
  });
  return new PrismaClient({ adapter, log: ["error"] });
}

const base = globalForPrisma.foodtracePrisma ?? createPrisma();

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        await ensureDatabase();
        return query(args);
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.foodtracePrisma = base;

export function databaseProvider(): "turso" | "sqlite" {
  return process.env.TURSO_DATABASE_URL?.trim() ? "turso" : "sqlite";
}
