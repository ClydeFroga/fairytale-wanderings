import { AppError } from "./AppError";

/** Файл оферты или политики не подходит: формат, размер или содержимое. Текст — для баннера в CRM. */
export class InvalidDocumentError extends AppError {
  constructor(message: string) {
    super(message, 400, "INVALID_DOCUMENT");
  }
}

/** Документ не загружали (или файл пропал с диска). */
export class DocumentNotFoundError extends AppError {
  constructor() {
    super("Документ не загружен", 404, "DOCUMENT_NOT_FOUND");
  }
}
