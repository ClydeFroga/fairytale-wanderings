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

/** Тариф не из разрешённых (CDEK_TARIFFS_*) или СДЭК его на это направление не считает. */
export class InvalidTariffError extends AppError {
  constructor(tariffCode?: number) {
    super('Тариф доставки недоступен', 400, 'CDEK_INVALID_TARIFF', { tariffCode })
  }
}

export class DeliveryPointNotFoundError extends AppError {
  constructor(code: string) {
    super(`Пункт выдачи не найден: ${code}`, 400, 'CDEK_POINT_NOT_FOUND', { code })
  }
}

/** Цена доставки, посчитанная сервером, не совпала с той, что видел покупатель. */
export class DeliveryPriceChangedError extends AppError {
  constructor(price: number) {
    super('Стоимость доставки изменилась', 409, 'DELIVERY_PRICE_CHANGED', { price })
  }
}
