import { sign } from "@telegram-apps/init-data-node";

// Токен и админ для тестов. Переменные окружения ставим при каждом вызове:
// другие тест-файлы их чистят под свои сценарии, а порядок файлов не гарантирован.
export const TEST_BOT_TOKEN = "123456:TEST_BOT_TOKEN";
export const ADMIN_TELEGRAM_ID = 900001;

export function signInitData(
  telegramId: number,
  firstName = "Хозяйка",
  token = TEST_BOT_TOKEN,
): string {
  return sign({ user: { id: telegramId, first_name: firstName } } as never, token, new Date());
}

/** Заголовки владелицы магазина: свежая initData + её id в ADMIN_TELEGRAM_IDS. */
export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  process.env.BOT_TOKEN = TEST_BOT_TOKEN;
  process.env.ADMIN_TELEGRAM_IDS = String(ADMIN_TELEGRAM_ID);

  return { Authorization: `tma ${signInitData(ADMIN_TELEGRAM_ID)}`, ...extra };
}

/** Заголовки обычного пользователя Mini App (личность есть, прав нет). */
export function customerHeaders(telegramId = 900002): Record<string, string> {
  process.env.BOT_TOKEN = TEST_BOT_TOKEN;
  process.env.ADMIN_TELEGRAM_IDS = String(ADMIN_TELEGRAM_ID);

  return { Authorization: `tma ${signInitData(telegramId, "Гость")}` };
}

/** Значение куки `admin_session` из ответа `POST /auth/login`. */
export function sessionCookie(res: Response): string {
  const raw = res.headers.get("set-cookie") ?? "";
  return raw.split(";")[0] ?? "";
}
