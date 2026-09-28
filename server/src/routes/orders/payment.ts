import type { IOrder } from '@global/database/shema'
import { getRobokassaConfig } from '@global/robokassa/config'
import { buildPaymentUrl, buildReceipt, type ReceiptLine } from '@global/robokassa/signature'
import { SHOP_NAME } from '@global/seo/config'

/**
 * Подписанная ссылка на оплату заказа. null — оплата выключена или у заказа нет
 * срока оплаты (оформлен без онлайн-оплаты). Срок в ссылке — тот же, что у
 * заказа: повторная ссылка его не продлевает.
 */
export function paymentUrlFor(order: IOrder, lines: ReceiptLine[]): string | null {
  const config = getRobokassaConfig()
  if (!config || !order.paymentExpiresAt) return null

  return buildPaymentUrl(config, {
    invId: order.number,
    outSum: order.totalPrice,
    description: `Заказ ${order.number}, ${SHOP_NAME}`,
    email: order.email,
    receipt: config.receipt ? buildReceipt(lines, order.deliveryPrice, config.tax) : null,
    expiresAt: order.paymentExpiresAt,
  })
}
