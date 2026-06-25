import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "@global/errors";

// Если выброшена прикладная ошибка — отдаём её текст и статус.
// Остальное логируем и отвечаем 500.
export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.text(err.message, err.status as ContentfulStatusCode);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}
