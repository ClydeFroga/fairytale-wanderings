/**
 * Текст ошибки для лога — без самого объекта. Ошибки запросов к Telegram API
 * несут адрес вида `api.telegram.org/bot<токен>/...` в своих полях, и вывод
 * объекта целиком печатал бы токен бота в логи.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
