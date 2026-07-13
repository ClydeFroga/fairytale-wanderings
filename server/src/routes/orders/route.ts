import { Hono } from 'hono'
import { createOrderValidator } from './validator'
import { ProductMethods } from '@global/database/methods/product'
import { OrderMethods } from '@global/database/methods/order'
import { OrderItemMethods } from '@global/database/methods/orderItem'
import { runInTransaction } from '@global/database/transaction'
import { InsufficientStockError, ProductNotFoundError } from '@global/errors'
import { sendOwnerMail } from '@global/mail/mailer'
import { buildOrderEmail } from '@global/mail/orderEmail'

const app = new Hono()

app.post('/create', createOrderValidator, async (c) => {
  const input = c.req.valid('json')

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
        customerName: input.customerName,
        contact: input.contact,
        deliveryAddress: input.deliveryAddress,
        totalPrice,
        channel: 'web',
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

  return c.json(order, 201)
})

export default app
