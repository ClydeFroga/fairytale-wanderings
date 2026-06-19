import { beforeAll, afterAll, afterEach } from "bun:test";

// После миграции на Drizzle отдельный мок mongoose не нужен.
// Сервисы, обращающиеся к БД, мокируются точечно в самих тестах.

beforeAll(async () => {});

afterAll(async () => {});

afterEach(async () => {});
