import type { IUser } from "@global/database/shema";

/**
 * Кто админ. Два источника, объединяются по «или»:
 * - `ADMIN_TELEGRAM_IDS` в `.env` — список telegramId через запятую (основной способ:
 *   не требует лезть в БД и переживает пересоздание пользователя);
 * - флаг `users.is_admin` в БД — выдача прав вручную.
 *
 * Проверку прав всегда делаем по telegramId из проверенной `initData`
 * (или из апдейта бота) — id из запроса клиента доверять нельзя.
 */
export function isAdmin(telegramId: number, dbUser?: Pick<IUser, "isAdmin"> | null): boolean {
  return dbUser?.isAdmin === true || isAdminTelegramId(telegramId);
}

/** Только проверка по `.env` — без обращения к БД. */
export function isAdminTelegramId(telegramId: number): boolean {
  return parseAdminIds().includes(telegramId);
}

// Парсим на каждый вызов: вызовов единицы, зато переменную можно менять в тестах.
function parseAdminIds(): number[] {
  return (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}
