import type { IOrder } from '@global/database/shema'
import { OrderItemMethods } from '@global/database/methods/orderItem'
import { sendOwnerMail } from '@global/mail/mailer'
import { buildLatePaymentEmail, buildOrderEmail } from '@global/mail/orderEmail'
import { notifyOrderStatus } from '@global/notify/orderNotify'

const MAX_INV_ID = 2_147_483_647 // orders.number — integer

/** InvId из запроса Робокассы → номер заказа. null — не наш формат. */
export function parseInvId(value: string | undefined): number | null {
  if (!value || !/^\d{1,10}$/.test(value)) return null
  const number = Number(value)
  return number > 0 && number <= MAX_INV_ID ? number : null
}

/**
 * Письмо владелице с составом и уведомление покупателю в Telegram. Best-effort:
 * заказ уже оплачен, поэтому ни сбой чтения состава, ни почта не мешают остальному.
 */
export async function announcePaidOrder(order: IOrder, telegramId: number | null): Promise<void> {
  try {
    let items: Awaited<ReturnType<typeof OrderItemMethods.getByOrderIds>> = []
    try {
      items = await OrderItemMethods.getByOrderIds([order.id])
    } catch (err) {
      console.error(`Не удалось прочитать состав оплаченного заказа №${order.number}:`, err)
    }

    await sendOwnerMail(
      buildOrderEmail(
        order,
        items.map((item) => ({
          name: item.productName ?? 'Товар удалён',
          quantity: item.quantity,
          price: item.price,
        })),
        'paid',
      ),
    )
  } catch (err) {
    console.error('Не удалось отправить письмо об оплате:', err)
  }

  if (telegramId !== null) await notifyOrderStatus(telegramId, order)
}

export async function announceLatePayment(order: IOrder): Promise<void> {
  try {
    await sendOwnerMail(buildLatePaymentEmail(order))
  } catch (err) {
    console.error('Не удалось отправить письмо об оплате отменённого заказа:', err)
  }
}
