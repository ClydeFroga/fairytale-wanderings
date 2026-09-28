import { OrderMethods } from '@global/database/methods/order'
import { OrderItemMethods } from '@global/database/methods/orderItem'
import { ProductMethods } from '@global/database/methods/product'
import { runInTransaction } from '@global/database/transaction'
import { notifyOrderStatus } from '@global/notify/orderNotify'

// Неоплаченный заказ держит товар до payment_expires_at. Дальше — отмена и
// возврат остатка. Робокасса после того же срока оплату не примет (ExpirationDate
// в ссылке); если всё же примет — это разбирает Result (письмо владелице).

const EXPIRE_INTERVAL_MS = 5 * 60_000

/** Отменяет просроченные неоплаченные заказы. Возвращает, сколько отменено. */
export async function expireUnpaidOrders(now: Date = new Date()): Promise<number> {
  const expired = await OrderMethods.getExpiredUnpaid(now)
  let cancelled = 0

  for (const order of expired) {
    try {
      const updated = await runInTransaction(async (tx) => {
        // Заказ могли оплатить между выборкой и отменой — тогда null, остаток не трогаем.
        const row = await OrderMethods.cancelUnpaid(order.id, tx)
        if (!row) return null

        const items = await OrderItemMethods.getByOrderIds([order.id], tx)
        for (const item of items) {
          if (item.productId) await ProductMethods.incrementStock(item.productId, item.quantity, tx)
        }
        return row
      })
      if (!updated) continue

      cancelled += 1
      if (order.telegramId !== null) await notifyOrderStatus(order.telegramId, updated)
    } catch (err) {
      // Один сбойный заказ не должен останавливать остальные.
      console.error(`Не удалось отменить просроченный заказ ${order.id}:`, err)
    }
  }

  return cancelled
}

/** Запуск по таймеру из index.ts. В тестах expireUnpaidOrders вызывается напрямую. */
export function startPaymentExpiry(): void {
  const run = () =>
    expireUnpaidOrders().catch((err) => console.error('Сборщик просроченных заказов упал:', err))

  run()
  setInterval(run, EXPIRE_INTERVAL_MS)
}
