// Базовая ошибка приложения: несёт HTTP-статус, чтобы middleware отдал его обобщённо.
// code — машиночитаемый идентификатор для клиента, details — структурированные данные.
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}
