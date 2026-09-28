import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { eq } from 'drizzle-orm'
import { createApp } from '../../app'
import { resetDatabase } from '../../test/e2e/db'
import { db } from '@global/database/DatabaseSingleton'
import { ProductMethods } from '@global/database/methods/product'
import { orders, type IOrder, type IProduct } from '@global/database/shema'
import { clearRobokassaEnv, setRobokassaEnv } from '../../test/e2e/robokassa'
import { expireUnpaidOrders } from './expireOrders'

const app = createApp()

async function createOrder(product: IProduct, quantity: number): Promise<IOrder> {
  const res = await app.fetch(
    new Request('http://localhost/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product._id, quantity }],
        contact: '+79990001122',
        deliveryAddress: 'ул. Тестовая, 1',
      }),
    }),
  )
  return (await res.json()) as IOrder
}

async function orderRow(id: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, id))
  return row!
}

describe('expireUnpaidOrders', () => {
  let teddy: IProduct

  beforeEach(async () => {
    clearRobokassaEnv()
    const products = await resetDatabase()
    teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
  })

  afterEach(() => clearRobokassaEnv())

  it('просроченный неоплаченный заказ отменяется, остаток возвращается', async () => {
    setRobokassaEnv()
    const order = await createOrder(teddy, 2)
    const later = new Date(new Date(order.paymentExpiresAt!).getTime() + 1000)

    const cancelled = await expireUnpaidOrders(later)

    expect(cancelled).toBe(1)
    expect((await orderRow(order.id)).status).toBe('cancelled')
    expect((await ProductMethods.getById(teddy._id))?.stock).toBe(teddy.stock)
  })

  it('не трогает заказ до истечения срока', async () => {
    setRobokassaEnv()
    const order = await createOrder(teddy, 1)

    expect(await expireUnpaidOrders(new Date())).toBe(0)
    expect((await orderRow(order.id)).status).toBe('created')
  })

  it('не трогает оплаченный заказ и заказ без срока оплаты', async () => {
    setRobokassaEnv()
    const paid = await createOrder(teddy, 1)
    await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, paid.id))
    clearRobokassaEnv()
    const offline = await createOrder(teddy, 1) // без онлайн-оплаты — срока нет

    const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60_000)
    expect(await expireUnpaidOrders(farFuture)).toBe(0)
    expect((await orderRow(paid.id)).status).toBe('paid')
    expect((await orderRow(offline.id)).status).toBe('created')
    expect((await ProductMethods.getById(teddy._id))?.stock).toBe(teddy.stock - 2)
  })

  it('повторный прогон не возвращает остаток второй раз', async () => {
    setRobokassaEnv()
    const order = await createOrder(teddy, 1)
    const later = new Date(new Date(order.paymentExpiresAt!).getTime() + 1000)

    await expireUnpaidOrders(later)
    expect(await expireUnpaidOrders(later)).toBe(0)
    expect((await ProductMethods.getById(teddy._id))?.stock).toBe(teddy.stock)
  })
})
