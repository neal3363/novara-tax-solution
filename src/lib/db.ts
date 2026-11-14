import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;
let local: Promise<PGlite> | undefined;

/**
 * Shared SQL helper.
 * - With DATABASE_URL: Postgres (multi-instance rate-limit + audit durability).
 * - Without (local/dev): file-backed PGlite under .data/ so records survive restarts.
 * - Under Vitest: in-memory PGlite to avoid worker file locks.
 */
export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return (await (await local).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const underTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  let db: PGlite;
  if (underTest) {
    db = new PGlite();
  } else {
    const dataDir = path.join(process.cwd(), ".data", "security");
    await mkdir(dataDir, { recursive: true });
    db = new PGlite(dataDir);
  }
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}

export function usingSharedDatabase(): boolean {
  return databaseUrl !== "";
}
