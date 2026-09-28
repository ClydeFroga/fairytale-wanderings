import { AppError } from './AppError'

/** Креды Робокассы не заданы — онлайн-оплата выключена. */
export class PaymentNotConfiguredError extends AppError {
  constructor() {
    super('Онлайн-оплата не настроена', 503, 'PAYMENT_NOT_CONFIGURED')
  }
}

/** Заказ уже нельзя оплатить: истёк срок, оплачен или отменён. */
export class PaymentExpiredError extends AppError {
  constructor(orderId: string) {
    super('Время на оплату заказа истекло', 409, 'PAYMENT_EXPIRED', { orderId })
  }
}

/** Уведомление Робокассы с неверной подписью — не от неё или подделано. */
export class InvalidPaymentSignatureError extends AppError {
  constructor() {
    super('Неверная подпись уведомления об оплате', 400, 'INVALID_SIGNATURE')
  }
}

/** Оплачено не столько, сколько стоит заказ. */
export class PaymentAmountMismatchError extends AppError {
  constructor(expected: number, received: string) {
    super('Сумма оплаты не совпадает с суммой заказа', 400, 'PAYMENT_AMOUNT_MISMATCH', {
      expected,
      received,
    })
  }
}
