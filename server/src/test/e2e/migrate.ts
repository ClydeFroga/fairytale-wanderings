import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "@global/database/shema";
import path from "node:path";

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  const migrationsFolder = path.join(import.meta.dir, "../../../drizzle");
  await migrate(db, { migrationsFolder });
  await pool.end();
}
