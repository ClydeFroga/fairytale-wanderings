import { Hono } from 'hono'
import { createOrderValidator, updateOrderStatusValidator } from './validator'
import { quoteDelivery } from './delivery'
import { ProductMethods } from '@global/database/methods/product'
import { OrderMethods } from '@global/database/methods/order'
import { OrderItemMethods } from '@global/database/methods/orderItem'
import { runInTransaction } from '@global/database/transaction'
import {
  InsufficientStockError,
  InvalidStatusTransitionError,
  OrderNotFoundError,
  PaymentExpiredError,
  PaymentNotConfiguredError,
  ProductNotFoundError,
} from '@global/errors'
import { sendOwnerMail } from '@global/mail/mailer'
import { buildOrderEmail } from '@global/mail/orderEmail'
import { verifyInitData } from '@global/telegram/initData'
import { UserMethods } from '@global/database/methods/user'
import { notifyOrderCreated, notifyOrderStatus } from '@global/notify/orderNotify'
import { getPaymentTtlMinutes, getRobokassaConfig } from '@global/robokassa/config'
import { requireAdmin } from '../../middleware/requireAdmin'
import { paymentUrlFor } from './payment'
import { buildOrderList, isUuid } from './helpers'
import { canTransition } from './statusFlow'

const app = new Hono()

// Список заказов для CRM: сам заказ + состав с названиями товаров.
app.get('/', requireAdmin, async (c) => {
  const orders = await OrderMethods.getList()
  const items = await OrderItemMethods.getByOrderIds(orders.map((order) => order.id))

  return c.json(buildOrderList(orders, items))
})

// Смена статуса из CRM. Разрешённые переходы — в statusFlow.ts.
app.patch('/:id/status', requireAdmin, updateOrderStatusValidator, async (c) => {
  const { id } = c.req.param()
  const { status } = c.req.valid('json')

  const current = await OrderMethods.getById(id)
  if (!current) throw new OrderNotFoundError(id)
  if (!canTransition(current.status, status)) {
    throw new InvalidStatusTransitionError(current.status, status)
  }

  // Пишем, только если статус не сменился после чтения: иначе можно затереть
  // отмену сборщиком просроченных заказов или оплату из Result.
  const updated = await OrderMethods.updateStatus(id, status, current.status)
  if (!updated) throw new InvalidStatusTransitionError(current.status, status)

  // Уведомление клиенту — только для заказов из Telegram (у веб-гостя нет chat_id).
  // Ошибки глушатся внутри, статус меняется в любом случае.
  if (current.telegramId !== null) {
    await notifyOrderStatus(current.telegramId, updated)
  }

  // Отдаём заказ в той же форме, что и список (с составом), чтобы клиент мог
  // просто заменить строку в списке ответом.
  const items = await OrderItemMethods.getByOrderIds([id])
  // Телеграм-профиль берём из уже прочитанного заказа, свежие поля — из updated.
  const [entry] = buildOrderList([{ ...current, ...updated }], items)

  return c.json(entry)
})

app.post('/create', createOrderValidator, async (c) => {
  const input = c.req.valid('json')

  // Канал заказа: если пришла валидная initData Mini App — это заказ из Telegram,
  // привязываем к пользователю. Подделанная/протухшая initData → 401 (throw внутри).
  let channel: 'web' | 'telegram' = 'web'
  let userId: string | null = null
  let notifyChatId: number | null = null
  if (input.initData) {
    const { user } = verifyInitData(input.initData)
    const dbUser = await UserMethods.upsertByTelegram({
      telegramId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: input.contact, // сохраняем в профиль телефон, введённый в заказе
    })
    channel = 'telegram'
    userId = dbUser.id
    notifyChatId = user.id // = chat_id приватного чата, для уведомлений
  }

  const ids = input.items.map((item) => item.productId)
  const prods = await ProductMethods.getByIds(ids)
  const byId = new Map(prods.map((p) => [p._id, p]))

  // Проверка наличия и существования. Нехватки собираем по всем позициям сразу,
  // чтобы клиент мог подсветить все недостающие товары за один ответ.
  const shortages = []
  for (const item of input.items) {
    const product = byId.get(item.productId)
    if (!product) throw new ProductNotFoundError(item.productId)
    if (product.stock < item.quantity)
      shortages.push({
        productId: item.productId,
        available: product.stock,
        requested: item.quantity,
      })
  }
  if (shortages.length) throw new InsufficientStockError(shortages)

  // Цену фиксируем из БД, а не из запроса клиента
  const items = input.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: byId.get(item.productId)!.price,
  }))

  // Доставку считаем до транзакции: это сетевой запрос в СДЭК, держать
  // блокировки остатков на время него незачем. Ручной адрес — null.
  const deliveryPrice = await quoteDelivery(
    input,
    input.items.map((item) => {
      const product = byId.get(item.productId)!
      return {
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        quantity: item.quantity,
      }
    }),
  )

  const goodsTotal = items.reduce((acc, it) => acc + it.quantity * it.price, 0)
  // К оплате — товары и доставка; deliveryPrice дополнительно хранится отдельно.
  const totalPrice = goodsTotal + (deliveryPrice ?? 0)

  // С онлайн-оплатой заказ держит товар ограниченное время — дальше его
  // отменит сборщик (global/payments/expireOrders.ts) и вернёт остаток.
  const paymentEnabled = getRobokassaConfig() !== null
  const paymentExpiresAt = paymentEnabled
    ? new Date(Date.now() + getPaymentTtlMinutes() * 60_000)
    : null

  const order = await runInTransaction(async (tx) => {
    for (const item of items) {
      const ok = await ProductMethods.decrementStock(item.productId, item.quantity, tx)
      if (!ok) {
        const product = byId.get(item.productId)
        throw new InsufficientStockError([
          { productId: item.productId, available: product?.stock ?? 0, requested: item.quantity },
        ])
      }
    }

    const created = await OrderMethods.create(
      {
        userId,
        customerName: input.customerName,
        contact: input.contact,
        email: input.email,
        deliveryAddress: input.deliveryAddress,
        deliveryMethod: input.deliveryMethod,
        deliveryPointCode: input.deliveryPointCode,
        deliveryTariffCode: input.deliveryTariffCode,
        deliveryPrice,
        totalPrice,
        channel,
        status: 'created',
        paymentExpiresAt,
      },
      tx,
    )

    await OrderItemMethods.addMany(
      items.map((it) => ({ ...it, orderId: created.id })),
      tx,
    )

    return created
  })

  const lines = items.map((it) => ({
    name: byId.get(it.productId)!.name,
    quantity: it.quantity,
    price: it.price,
  }))
  const paymentUrl = paymentUrlFor(order, lines)

  // Без онлайн-оплаты письмо уходит сразу, как раньше. С оплатой — по факту
  // оплаты (routes/payments), чтобы брошенные корзины не отвлекали владелицу.
  if (!paymentUrl) {
    try {
      await sendOwnerMail(buildOrderEmail(order, lines))
    } catch (err) {
      console.error('Не удалось отправить письмо о заказе:', err)
    }
  }

  // Уведомление клиенту в Telegram (для заказов из Mini App). Best-effort:
  // ошибки глушатся внутри sendCustomerMessage, заказ они не ломают.
  if (notifyChatId !== null) {
    await notifyOrderCreated(notifyChatId, order, { awaitingPayment: paymentUrl !== null })
  }

  return c.json({ ...order, paymentUrl }, 201)
})

// Статус заказа для страницы /order/:id — открыт без авторизации: uuid не
// угадать, а наружу уходит только номер, статус, сумма и срок оплаты.
app.get('/:id/public', async (c) => {
  const { id } = c.req.param()
  const order = isUuid(id) ? await OrderMethods.getById(id) : null
  if (!order) throw new OrderNotFoundError(id)

  return c.json({
    id: order.id,
    number: order.number,
    status: order.status,
    totalPrice: order.totalPrice,
    paymentExpiresAt: order.paymentExpiresAt,
    paymentEnabled: getRobokassaConfig() !== null,
  })
})

// Повторная ссылка на оплату — если покупатель ушёл со страницы Робокассы.
// Срок не продлевается: он же держит товар на складе.
app.post('/:id/payment-link', async (c) => {
  const { id } = c.req.param()
  if (!getRobokassaConfig()) throw new PaymentNotConfiguredError()

  const order = isUuid(id) ? await OrderMethods.getById(id) : null
  if (!order) throw new OrderNotFoundError(id)

  const expired = !order.paymentExpiresAt || order.paymentExpiresAt.getTime() <= Date.now()
  if (order.status !== 'created' || expired) throw new PaymentExpiredError(id)

  const items = await OrderItemMethods.getByOrderIds([id])
  const paymentUrl = paymentUrlFor(
    order,
    items.map((item) => ({
      name: item.productName ?? 'Товар',
      quantity: item.quantity,
      price: item.price,
    })),
  )

  return c.json({ paymentUrl })
})

export default app
