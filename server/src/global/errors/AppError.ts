// Базовая ошибка приложения: несёт HTTP-статус, чтобы middleware отдал его обобщённо.
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}
