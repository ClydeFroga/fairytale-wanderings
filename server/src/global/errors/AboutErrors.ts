import { AppError } from "./AppError";

/** Форма «Обо мне» не прошла проверку. Текст — для баннера в CRM. */
export class InvalidAboutError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 400, "INVALID_ABOUT", { field });
  }
}
