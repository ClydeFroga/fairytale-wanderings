import { Hono, type Context } from 'hono'
import { OrderMethods } from '@global/database/methods/order'
import { getRobokassaConfig } from '@global/robokassa/config'
import { verifyResultSignature } from '@global/robokassa/signature'
import { publicSiteUrl } from '@global/seo/config'
import { isUuid } from '@global/utils/isUuid'
import {
  InvalidPaymentSignatureError,
  OrderNotFoundError,
  PaymentAmountMismatchError,
  PaymentNotConfiguredError,
} from '@global/errors'
import { announceLatePayment, announcePaidOrder, parseInvId } from './helpers'

// Оплата через Робокассу. Адреса для технических настроек магазина в ЛК:
//   Result URL  — POST <API>/payments/robokassa/result  (подтверждение оплаты)
//   Success URL — GET  <API>/payments/robokassa/success (возврат покупателя)
//   Fail URL    — GET  <API>/payments/robokassa/fail
// Статус заказа меняет только Result: он подписан паролем №2. Success и Fail —
// просто переходы браузера, по ним ничего не меняем.
const app = new Hono()

// Витрине нужно знать только, показывать ли «Оплатить» вместо «Оформить».
app.get('/config', (c) => c.json({ enabled: getRobokassaConfig() !== null }))

// Метод запросов задаётся в ЛК — принимаем и форму (POST), и query (GET).
async function readParams(c: Context): Promise<Record<string, string>> {
  if (c.req.method !== 'POST') return c.req.query()

  const body = await c.req.parseBody()
  return Object.fromEntries(
    Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

app.on(['GET', 'POST'], '/robokassa/result', async (c) => {
  const config = getRobokassaConfig()
  if (!config) throw new PaymentNotConfiguredError()

  const params = await readParams(c)
  const outSum = params.OutSum ?? ''
  const invIdRaw = params.InvId ?? ''
  const signature = params.SignatureValue ?? ''
  // Свои параметры (Shp_order) входят в подпись — берём все, как пришли.
  const shp = Object.fromEntries(Object.entries(params).filter(([name]) => name.startsWith('Shp_')))

  if (!verifyResultSignature(config, { outSum, invId: invIdRaw, signature, shp })) {
    throw new InvalidPaymentSignatureError()
  }

  const invId = parseInvId(invIdRaw)
  const order = invId === null ? null : await OrderMethods.getByNumber(invId)
  // Робокасса будет повторять — пусть: такого не должно быть, это видно в логах.
  if (!order) throw new OrderNotFoundError(invIdRaw)

  if (Number(outSum) !== order.totalPrice) {
    console.error(`Робокасса: сумма ${outSum} не равна сумме заказа №${order.number} (${order.totalPrice})`)
    throw new PaymentAmountMismatchError(order.totalPrice, outSum)
  }

  const payment = {
    paidAt: new Date(),
    paymentMethod: params.PaymentMethod || params.IncCurrLabel || null,
  }

  // created → paid атомарно: повтор уведомления или гонка со сборщиком
  // просроченных заказов вернут null и не дадут второго письма.
  const paid = order.status === 'created' ? await OrderMethods.markPaid(order.id, payment) : null

  if (paid) {
    await announcePaidOrder(paid, order.telegramId, { isTest: config.isTest })
  } else {
    // Заказ успели отменить (истёк срок или вручную) — деньги пришли, а заказа
    // уже нет. Фиксируем оплату один раз и зовём владелицу разобраться.
    const current = await OrderMethods.getById(order.id)
    if (current?.status === 'cancelled') {
      const late = await OrderMethods.recordLatePayment(order.id, payment)
      if (late) await announceLatePayment(late)
    }
  }

  // Без этого ответа Робокасса считает уведомление недоставленным и повторяет.
  return c.text(`OK${invIdRaw}`)
})

app.on(['GET', 'POST'], '/robokassa/:outcome{success|fail}', async (c) => {
  const params = await readParams(c)
  const base = publicSiteUrl() ?? ''

  // Номер заказа последовательный, его легко перебрать — поэтому на страницу
  // заказа ведём только по uuid из Shp_order, и то если он сходится с InvId.
  const uuid = params.Shp_order ?? ''
  const order = isUuid(uuid) ? await OrderMethods.getById(uuid) : null
  const matches = order !== null && order.number === parseInvId(params.InvId)

  return c.redirect(matches ? `${base}/order/${order.id}` : `${base}/`, 302)
})

export default app
