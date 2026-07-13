import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "@global/errors";

// Если выброшена прикладная ошибка — отдаём JSON с текстом, кодом и деталями.
// Остальное логируем и отвечаем 500.
export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, code: err.code, details: err.details },
      err.status as ContentfulStatusCode
    );
  }
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
}
