import { createHash, timingSafeEqual } from 'node:crypto'
import type { RobokassaConfig, RobokassaHash } from './config'

// Чистые функции протокола Робокассы: без сети и БД, поэтому покрыты unit-тестами.
// Формулы — docs.robokassa.ru (pay-interface, notifications-and-redirects).

export const PAYMENT_PAGE_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx'

const DESCRIPTION_LIMIT = 100
const RECEIPT_NAME_LIMIT = 128
const MSK_OFFSET_MS = 3 * 60 * 60_000 // Москва — UTC+3 круглый год

/** Позиция заказа для чека: цена за единицу в рублях. */
export type ReceiptLine = {
  name: string
  quantity: number
  price: number
}

export type ReceiptItem = {
  name: string
  quantity: number
  sum: number
  tax: string
  payment_method: 'full_payment'
  payment_object: 'commodity' | 'service'
}

export type Receipt = { items: ReceiptItem[] }

export type PaymentRequest = {
  invId: number
  outSum: number // рубли, целые (как цены в БД)
  description: string
  email?: string | null
  receipt?: Receipt | null
  expiresAt: Date
}

function digest(hash: RobokassaHash, value: string): string {
  return createHash(hash).update(value, 'utf8').digest('hex')
}

export function formatOutSum(rub: number): string {
  return rub.toFixed(2)
}

/** Робокасса ждёт `YYYY-MM-DDThh:mm` без зоны — отдаём московское время. */
export function formatExpirationDate(date: Date): string {
  return new Date(date.getTime() + MSK_OFFSET_MS).toISOString().slice(0, 16)
}

/** Чек: товары и доставка отдельной строкой (услуга). Сумма строк = сумма оплаты. */
export function buildReceipt(lines: ReceiptLine[], deliveryPrice: number | null, tax: string): Receipt {
  const items: ReceiptItem[] = lines.map((line) => ({
    name: line.name.slice(0, RECEIPT_NAME_LIMIT),
    quantity: line.quantity,
    sum: line.quantity * line.price,
    tax,
    payment_method: 'full_payment',
    payment_object: 'commodity',
  }))

  if (deliveryPrice && deliveryPrice > 0) {
    items.push({
      name: 'Доставка СДЭК',
      quantity: 1,
      sum: deliveryPrice,
      tax,
      payment_method: 'full_payment',
      payment_object: 'service',
    })
  }

  return { items }
}

/**
 * Ссылка на платёжную страницу. Подпись: MerchantLogin:OutSum:InvId[:Receipt]:Пароль#1.
 * Receipt в подписи — JSON, закодированный один раз; в query URLSearchParams
 * закодирует его ещё раз, и Робокасса после разбора получит ровно строку из подписи.
 */
export function buildPaymentUrl(config: RobokassaConfig, req: PaymentRequest): string {
  const outSum = formatOutSum(req.outSum)
  const invId = String(req.invId)
  const signed = [config.merchantLogin, outSum, invId]

  const params = new URLSearchParams({
    MerchantLogin: config.merchantLogin,
    OutSum: outSum,
    InvId: invId,
    Description: req.description.slice(0, DESCRIPTION_LIMIT),
    Culture: 'ru',
    ExpirationDate: formatExpirationDate(req.expiresAt),
  })

  if (req.receipt) {
    // Защита от собственной ошибки: Робокасса отклонит чек, чья сумма не равна OutSum.
    const total = req.receipt.items.reduce((sum, item) => sum + item.sum, 0)
    if (total !== req.outSum) {
      throw new Error(`Сумма чека ${total} не равна сумме оплаты ${req.outSum}`)
    }

    const receipt = encodeURIComponent(JSON.stringify(req.receipt))
    signed.push(receipt)
    params.set('Receipt', receipt)
  }

  signed.push(config.password1)
  params.set('SignatureValue', digest(config.hash, signed.join(':')))

  if (req.email) params.set('Email', req.email)
  if (config.isTest) params.set('IsTest', '1')

  return `${PAYMENT_PAGE_URL}?${params}`
}

/**
 * Подпись уведомления Result: OutSum:InvId:Пароль#2. Строки берём как пришли —
 * Робокасса шлёт сумму с шестью знаками (1500.000000), пересобирать её нельзя.
 */
export function verifyResultSignature(
  config: RobokassaConfig,
  params: { outSum: string; invId: string; signature: string },
): boolean {
  const expected = Buffer.from(digest(config.hash, `${params.outSum}:${params.invId}:${config.password2}`))
  const received = Buffer.from(params.signature.toLowerCase())

  return expected.length === received.length && timingSafeEqual(expected, received)
}
