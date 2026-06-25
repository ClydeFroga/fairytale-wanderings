import { afterAll } from "bun:test";
import { startPostgres } from "./postgres";
import { runMigrations } from "./migrate";

// Не использовать dev DATABASE_URL из .env — тесты поднимают свой инстанс.
delete process.env.DATABASE_URL;

const postgres = await startPostgres();
process.env.DATABASE_URL = postgres.url;
await runMigrations(process.env.DATABASE_URL);

afterAll(async () => {
  const { DatabaseSingleton } = await import("@global/database/DatabaseSingleton");
  await DatabaseSingleton.getInstance().disconnect();
  await postgres.stop();
});
