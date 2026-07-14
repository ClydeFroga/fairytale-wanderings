import { AppError } from "./AppError";

// initData Telegram Mini App не прошла проверку подписи или протухла.
export class InvalidInitDataError extends AppError {
  constructor(message = "Недействительные данные Telegram") {
    super(message, 401, "INVALID_INIT_DATA");
  }
}
