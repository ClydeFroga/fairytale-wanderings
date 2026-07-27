import { Hono } from 'hono'
import { createOrderValidator, updateOrderStatusValidator } from './validator'
import { ProductMethods } from '@global/database/methods/product'
import { OrderMethods } from '@global/database/methods/order'
import { OrderItemMethods } from '@global/database/methods/orderItem'
import { runInTransaction } from '@global/database/transaction'
import {
  InsufficientStockError,
  InvalidStatusTransitionError,
  OrderNotFoundError,
  ProductNotFoundError,
} from '@global/errors'
import { sendOwnerMail } from '@global/mail/mailer'
import { buildOrderEmail } from '@global/mail/orderEmail'
import { verifyInitData } from '@global/telegram/initData'
import { UserMethods } from '@global/database/methods/user'
import { notifyOrderCreated, notifyOrderStatus } from '@global/notify/orderNotify'
import { requireAdmin } from '../../middleware/requireAdmin'
import { buildOrderList } from './helpers'
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

  const updated = await OrderMethods.updateStatus(id, status)
  if (!updated) throw new OrderNotFoundError(id)

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
  const totalPrice = items.reduce((acc, it) => acc + it.quantity * it.price, 0)

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
        totalPrice,
        channel,
        status: 'created',
      },
      tx,
    )

    await OrderItemMethods.addMany(
      items.map((it) => ({ ...it, orderId: created.id })),
      tx,
    )

    return created
  })

  // Письмо — после успешной записи. Сбой почты не должен ломать заказ.
  try {
    const emailItems = items.map((it) => ({
      name: byId.get(it.productId)!.name,
      quantity: it.quantity,
      price: it.price,
    }))
    await sendOwnerMail(buildOrderEmail(order, emailItems))
  } catch (err) {
    console.error('Не удалось отправить письмо о заказе:', err)
  }

  // Уведомление клиенту в Telegram (для заказов из Mini App). Best-effort:
  // ошибки глушатся внутри sendCustomerMessage, заказ они не ломают.
  if (notifyChatId !== null) {
    await notifyOrderCreated(notifyChatId, order)
  }

  return c.json(order, 201)
})

export default app
