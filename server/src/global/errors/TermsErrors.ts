import { AppError } from "./AppError";

/** Форма «Покупателям» не прошла проверку. Текст — для баннера в CRM. */
export class InvalidTermsError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 400, "INVALID_TERMS", { field });
  }
}
