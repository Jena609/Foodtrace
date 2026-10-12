import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { logServerError } from "@/lib/db/log";

let ready: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (!ready) {
    ready = applySchema().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

const VERIFICATION_COLUMNS: Array<[string, string]> = [
  ["lastError", "TEXT NOT NULL DEFAULT ''"],
  ["submittedAt", "DATETIME"],
  ["finalizedAt", "DATETIME"],
  ["genlayerNetwork", "TEXT NOT NULL DEFAULT ''"],
  ["genlayerChainId", "INTEGER NOT NULL DEFAULT 0"],
  ["contractAddress", "TEXT NOT NULL DEFAULT ''"],
  ["explorerTransactionUrl", "TEXT NOT NULL DEFAULT ''"],
];

function columnName(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  return String((row as { name?: unknown }).name ?? "");
}

async function ensureVerificationColumns(client: Client): Promise<void> {
  const existing = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'User'");
  if (existing.rows.length === 0) {
    const sql = readFileSync(join(process.cwd(), "prisma", "migrations", "20261011120000_init", "migration.sql"), "utf8");
    await client.executeMultiple(sql);
  }
  const info = await client.execute('PRAGMA table_info("VerificationResult")');
  const names = new Set(info.rows.map((row) => columnName(row)));
  for (const [name, ddl] of VERIFICATION_COLUMNS) {
    if (names.has(name)) continue;
    await client.execute(`ALTER TABLE "VerificationResult" ADD COLUMN "${name}" ${ddl}`);
  }
  await client.execute(`CREATE TABLE IF NOT EXISTS "GenLayerWriteLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT NOT NULL DEFAULT '',
    "lockedAt" TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'
  )`);
  await client.execute(`INSERT OR IGNORE INTO "GenLayerWriteLock" ("id", "owner", "lockedAt") VALUES ('write', '', '1970-01-01T00:00:00.000Z')`);
}

async function applySchema(): Promise<void> {
  const url = process.env.TURSO_DATABASE_URL?.trim() ?? "";
  if (url) {
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim() ?? "";
    if (!authToken) throw new Error("TURSO_AUTH_TOKEN is missing.");
    const client = createClient({ url, authToken });
    try {
      await ensureVerificationColumns(client);
    } catch (error) {
      logServerError("database.schema", error);
      throw error;
    } finally {
      client.close();
    }
    return;
  }
  const fileUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!fileUrl.startsWith("file:")) return;
  const client = createClient({ url: fileUrl });
  try {
    await ensureVerificationColumns(client);
  } catch (error) {
    logServerError("database.schema", error);
  } finally {
    client.close();
  }
}
