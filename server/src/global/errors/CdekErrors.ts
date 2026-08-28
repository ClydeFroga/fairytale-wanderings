import { AppError } from './AppError'

/** Креды интеграции не заданы — доставку СДЭК просто не показываем клиенту. */
export class CdekNotConfiguredError extends AppError {
  constructor() {
    super('Доставка СДЭК не настроена', 503, 'CDEK_NOT_CONFIGURED')
  }
}

/** СДЭК ответил ошибкой или недоступен. Наружу не отдаём ни креды, ни его текст. */
export class CdekApiError extends AppError {
  constructor(status: number) {
    super('Сервис СДЭК временно недоступен', 502, 'CDEK_API_ERROR', { status })
  }
}
