import { AppError } from "./AppError";

/** Нет подтверждённой личности: ни сессии, ни свежей initData. */
export class UnauthorizedError extends AppError {
  constructor(message = "Требуется вход через Telegram") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** Личность известна, но это не админ. */
export class ForbiddenError extends AppError {
  constructor(message = "Доступ только для администратора") {
    super(message, 403, "FORBIDDEN");
  }
}
