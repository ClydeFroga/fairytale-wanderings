import { describe, it, expect, beforeEach, afterEach, spyOn, type Mock } from 'bun:test'
import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { createApp } from '../../app'
import { resetDatabase } from '../../test/e2e/db'
import { db } from '@global/database/DatabaseSingleton'
import { orders, type IOrder, type IProduct } from '@global/database/shema'
import * as mailer from '@global/mail/mailer'
import { PAYMENT_PAGE_URL } from '@global/robokassa/signature'
import { RK_LOGIN, RK_PASSWORD1, RK_PASSWORD2, clearRobokassaEnv, setRobokassaEnv } from '../../test/e2e/robokassa'

const app = createApp()

type CreatedOrder = IOrder & { paymentUrl: string | null }

const md5 = (value: string) => createHash('md5').update(value).digest('hex')

async function createOrder(product: IProduct, quantity = 1) {
  const res = await app.fetch(
    new Request('http://localhost/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: product._id, quantity }],
        customerName: 'Покупатель',
        contact: '+79990001122',
        email: 'buyer@example.com',
        deliveryAddress: 'ул. Тестовая, 1',
      }),
    }),
  )
  return { res, order: (await res.json()) as CreatedOrder }
}

describe('Payments E2E', () => {
  let products: IProduct[]
  let teddy: IProduct
  let mailSpy: Mock<typeof mailer.sendOwnerMail>

  beforeEach(async () => {
    clearRobokassaEnv()
    products = await resetDatabase()
    teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    mailSpy = spyOn(mailer, 'sendOwnerMail').mockResolvedValue(undefined)
  })

  afterEach(() => {
    mailSpy.mockRestore()
    clearRobokassaEnv()
  })

  describe('оформление', () => {
    it('оплата включена — подписанная ссылка, срок оплаты, письмо не отправлено', async () => {
      setRobokassaEnv()
      const before = Date.now()

      const { res, order } = await createOrder(teddy, 2)

      expect(res.status).toBe(201)
      expect(order.paymentUrl).toStartWith(PAYMENT_PAGE_URL)
      const url = new URL(order.paymentUrl!)
      const outSum = `${teddy.price * 2}.00`
      expect(url.searchParams.get('InvId')).toBe(String(order.number))
      expect(url.searchParams.get('OutSum')).toBe(outSum)
      expect(url.searchParams.get('Email')).toBe('buyer@example.com')
      expect(url.searchParams.get('IsTest')).toBe('1')
      expect(url.searchParams.get('SignatureValue')).toBe(
        md5(`${RK_LOGIN}:${outSum}:${order.number}:${RK_PASSWORD1}`),
      )

      const expires = new Date(order.paymentExpiresAt!).getTime()
      expect(expires).toBeGreaterThanOrEqual(before + 60 * 60_000 - 1000)
      expect(expires).toBeLessThanOrEqual(Date.now() + 60 * 60_000 + 1000)

      // Письмо владелице уйдёт по факту оплаты, а не на брошенную корзину.
      expect(mailSpy).not.toHaveBeenCalled()
    })

    it('оплата включена с чеком — Receipt с позициями заказа', async () => {
      setRobokassaEnv({ ROBOKASSA_RECEIPT: 'true' })

      const { order } = await createOrder(teddy, 2)
      const receipt = JSON.parse(
        decodeURIComponent(new URL(order.paymentUrl!).searchParams.get('Receipt')!),
      )

      expect(receipt.items).toEqual([
        {
          name: teddy.name,
          quantity: 2,
          sum: teddy.price * 2,
          tax: 'none',
          payment_method: 'full_payment',
          payment_object: 'commodity',
        },
      ])
    })

    it('оплата выключена — без ссылки и срока, письмо сразу', async () => {
      const { res, order } = await createOrder(teddy)

      expect(res.status).toBe(201)
      expect(order.paymentUrl).toBeNull()
      expect(order.paymentExpiresAt).toBeNull()
      expect(mailSpy).toHaveBeenCalledTimes(1)
    })

    it('срок оплаты — из PAYMENT_TTL_MINUTES', async () => {
      setRobokassaEnv({ PAYMENT_TTL_MINUTES: '15' })

      const { order } = await createOrder(teddy)
      const ttl = new Date(order.paymentExpiresAt!).getTime() - new Date(order.createdAt).getTime()

      expect(Math.round(ttl / 60_000)).toBe(15)
    })
  })

  describe('GET /orders/:id/public', () => {
    it('отдаёт статус без контактов и состава', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)

      const res = await app.fetch(new Request(`http://localhost/orders/${order.id}/public`))
      const body = (await res.json()) as Record<string, unknown>

      expect(res.status).toBe(200)
      expect(Object.keys(body).sort()).toEqual(
        ['id', 'number', 'paymentEnabled', 'paymentExpiresAt', 'status', 'totalPrice'].sort(),
      )
      expect(body.status).toBe('created')
      expect(body.paymentEnabled).toBe(true)
    })

    it('404 на неизвестный и кривой id', async () => {
      const unknown = await app.fetch(
        new Request('http://localhost/orders/00000000-0000-4000-8000-000000000000/public'),
      )
      const malformed = await app.fetch(new Request('http://localhost/orders/abc/public'))

      expect(unknown.status).toBe(404)
      expect(malformed.status).toBe(404)
    })
  })

  describe('POST /orders/:id/payment-link', () => {
    it('живой заказ — новая ссылка с тем же сроком', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)

      const res = await app.fetch(
        new Request(`http://localhost/orders/${order.id}/payment-link`, { method: 'POST' }),
      )
      const body = (await res.json()) as { paymentUrl: string }

      expect(res.status).toBe(200)
      expect(new URL(body.paymentUrl).searchParams.get('InvId')).toBe(String(order.number))
      expect(new URL(body.paymentUrl).searchParams.get('ExpirationDate')).toBe(
        new URL(order.paymentUrl!).searchParams.get('ExpirationDate'),
      )
    })

    it('срок истёк или заказ оплачен — 409 PAYMENT_EXPIRED', async () => {
      setRobokassaEnv()
      const { order: expired } = await createOrder(teddy)
      const { order: paid } = await createOrder(teddy)
      await db
        .update(orders)
        .set({ paymentExpiresAt: new Date(Date.now() - 60_000) })
        .where(eq(orders.id, expired.id))
      await db.update(orders).set({ status: 'paid' }).where(eq(orders.id, paid.id))

      for (const id of [expired.id, paid.id]) {
        const res = await app.fetch(
          new Request(`http://localhost/orders/${id}/payment-link`, { method: 'POST' }),
        )
        expect(res.status).toBe(409)
        expect(((await res.json()) as { code: string }).code).toBe('PAYMENT_EXPIRED')
      }
    })

    it('оплата выключена — 503', async () => {
      const { order } = await createOrder(teddy)

      const res = await app.fetch(
        new Request(`http://localhost/orders/${order.id}/payment-link`, { method: 'POST' }),
      )

      expect(res.status).toBe(503)
    })
  })

  it('GET /payments/config — включена ли оплата', async () => {
    const off = await app.fetch(new Request('http://localhost/payments/config'))
    expect(await off.json()).toEqual({ enabled: false })

    setRobokassaEnv()
    const on = await app.fetch(new Request('http://localhost/payments/config'))
    expect(await on.json()).toEqual({ enabled: true })
  })

  describe('Result URL', () => {
    function resultRequest(fields: Record<string, string>) {
      return new Request('http://localhost/payments/robokassa/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields),
      })
    }

    function signedResult(outSum: string, invId: number, extra: Record<string, string> = {}) {
      return resultRequest({
        OutSum: outSum,
        InvId: String(invId),
        SignatureValue: md5(`${outSum}:${invId}:${RK_PASSWORD2}`).toUpperCase(),
        ...extra,
      })
    }

    async function statusOf(id: string) {
      const [row] = await db.select().from(orders).where(eq(orders.id, id))
      return row!
    }

    it('верная подпись — заказ оплачен, OK{InvId}, письмо владелице', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)

      const res = await app.fetch(
        signedResult(`${order.totalPrice}.000000`, order.number, { PaymentMethod: 'BankCard' }),
      )

      expect(res.status).toBe(200)
      expect(await res.text()).toBe(`OK${order.number}`)
      const row = await statusOf(order.id)
      expect(row.status).toBe('paid')
      expect(row.paidAt).not.toBeNull()
      expect(row.paymentMethod).toBe('BankCard')
      expect(mailSpy).toHaveBeenCalledTimes(1)
      expect(mailSpy.mock.calls[0]![0].subject).toContain(`Оплачен заказ №${order.number}`)
    })

    it('повтор уведомления — снова OK, без второго письма', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)
      const outSum = `${order.totalPrice}.000000`

      await app.fetch(signedResult(outSum, order.number))
      const again = await app.fetch(signedResult(outSum, order.number))

      expect(await again.text()).toBe(`OK${order.number}`)
      expect(mailSpy).toHaveBeenCalledTimes(1)
    })

    it('неверная подпись — 400, заказ ждёт оплаты', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)

      const res = await app.fetch(
        resultRequest({ OutSum: `${order.totalPrice}.00`, InvId: String(order.number), SignatureValue: 'deadbeef' }),
      )

      expect(res.status).toBe(400)
      expect((await statusOf(order.id)).status).toBe('created')
    })

    it('сумма не совпала — 400, заказ ждёт оплаты', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)

      const res = await app.fetch(signedResult('1.00', order.number))

      expect(res.status).toBe(400)
      expect((await statusOf(order.id)).status).toBe('created')
    })

    it('неизвестный InvId — 404', async () => {
      setRobokassaEnv()

      const res = await app.fetch(signedResult('100.00', 999))

      expect(res.status).toBe(404)
    })

    it('оплата отменённого заказа — остаётся отменённым, paid_at записан, письмо о возврате один раз', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)
      // Так же выглядит и отмена сборщиком по сроку, и ручная отмена в CRM.
      await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, order.id))
      const outSum = `${order.totalPrice}.000000`

      const res = await app.fetch(signedResult(outSum, order.number))
      await app.fetch(signedResult(outSum, order.number))

      expect(await res.text()).toBe(`OK${order.number}`)
      const row = await statusOf(order.id)
      expect(row.status).toBe('cancelled')
      expect(row.paidAt).not.toBeNull()
      expect(mailSpy).toHaveBeenCalledTimes(1)
      expect(mailSpy.mock.calls[0]![0].subject).toContain('отменённый')
    })

    it('оплата выключена — 503', async () => {
      const res = await app.fetch(signedResult('100.00', 1))

      expect(res.status).toBe(503)
    })
  })

  describe('Success / Fail', () => {
    // Bun сам подхватывает server/.env — адрес сайта задаём явно.
    const savedSiteUrl = process.env.PUBLIC_SITE_URL
    beforeEach(() => {
      process.env.PUBLIC_SITE_URL = 'https://shop.test'
    })
    afterEach(() => {
      if (savedSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL
      else process.env.PUBLIC_SITE_URL = savedSiteUrl
    })

    it('возвращают покупателя на страницу заказа', async () => {
      setRobokassaEnv()
      const { order } = await createOrder(teddy)

      for (const outcome of ['success', 'fail']) {
        const res = await app.fetch(
          new Request(`http://localhost/payments/robokassa/${outcome}?InvId=${order.number}&OutSum=1`),
        )
        expect(res.status).toBe(302)
        expect(res.headers.get('location')).toBe(`https://shop.test/order/${order.id}`)
      }
    })

    it('неизвестный заказ — на главную', async () => {
      const res = await app.fetch(new Request('http://localhost/payments/robokassa/success?InvId=999'))

      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('https://shop.test/')
    })
  })
})
