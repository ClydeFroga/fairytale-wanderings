import { afterAll } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { startPostgres } from "./postgres";
import { runMigrations } from "./migrate";

// Не использовать dev DATABASE_URL из .env — тесты поднимают свой инстанс.
delete process.env.DATABASE_URL;

// Тесты ходят по защищённым роутам как настоящий админ, поэтому dev-выключатель
// проверки прав из .env не должен на них влиять.
delete process.env.ADMIN_AUTH_DISABLED;

// Картинки тестов — во временный каталог (Upload читает UPLOAD_PATH при загрузке
// модуля, поэтому переменную ставим здесь, до импорта приложения).
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "fairytale-uploads-"));
process.env.UPLOAD_PATH = uploadDir;

const postgres = await startPostgres();
process.env.DATABASE_URL = postgres.url;
await runMigrations(process.env.DATABASE_URL);

afterAll(async () => {
  const { DatabaseSingleton } = await import("@global/database/DatabaseSingleton");
  await DatabaseSingleton.getInstance().disconnect();
  await postgres.stop();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});
