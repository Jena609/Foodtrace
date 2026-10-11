import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { foodtracePrisma?: PrismaClient };

export const prisma = globalForPrisma.foodtracePrisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.foodtracePrisma = prisma;
