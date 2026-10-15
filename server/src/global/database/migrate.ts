import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "node:path";

// Применяет SQL-миграции из server/drizzle средствами drizzle-orm, без drizzle-kit:
// тот — dev-зависимость и в прод-образ не ставится. Журнал миграций тот же
// (drizzle.__drizzle_migrations), так что базу, накатанную `drizzle-kit migrate`,
// этот скрипт продолжает с того же места.
export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const migrationsFolder = path.join(import.meta.dir, "../../../drizzle");
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

// CLI для прод-образа: bun run db:migrate:deploy (из корня репозитория).
if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL не задан — миграции не применены");
    process.exit(1);
  }

  runMigrations(url)
    .then(() => console.log("Миграции применены"))
    .catch((error) => {
      console.error("Ошибка миграций:", error);
      process.exit(1);
    });
}
