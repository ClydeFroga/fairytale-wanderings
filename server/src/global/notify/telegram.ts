import { Telegram } from "telegraf";

let cached: Telegram | null = null;

function getTelegram(): Telegram | null {
  if (cached) return cached;

  const token = process.env.BOT_TOKEN;
  if (!token) return null;

  // Telegram-клиент telegraf работает по HTTP только с токеном — поллинг бота
  // запускать не нужно, поэтому уведомления не зависят от работающего бота.
  cached = new Telegram(token);
  return cached;
}

/**
 * Шлёт сообщение клиенту в Telegram (plain text, без parse_mode — экранирование не нужно).
 * Нет `BOT_TOKEN` → тихо пропускаем. Сбой отправки (клиент не начинал диалог с ботом,
 * заблокировал его и т.п.) логируется, но не пробрасывается: уведомление не должно
 * ломать бизнес-операцию, которая его инициировала.
 */
export async function sendCustomerMessage(chatId: number, text: string): Promise<void> {
  const telegram = getTelegram();
  if (!telegram) {
    console.warn("BOT_TOKEN не задан — уведомление в Telegram не отправлено");
    return;
  }

  try {
    await telegram.sendMessage(chatId, text);
  } catch (err) {
    console.error(`Не удалось отправить уведомление в Telegram (chatId=${chatId}):`, err);
  }
}
