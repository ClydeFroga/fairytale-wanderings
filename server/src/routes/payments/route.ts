import { Hono } from 'hono'
import { getRobokassaConfig } from '@global/robokassa/config'

// Оплата через Робокассу: настройка для витрины и (Task 5) уведомления и
// возвраты покупателя с платёжной страницы.
const app = new Hono()

// Витрине нужно знать только, показывать ли «Оплатить» вместо «Оформить».
app.get('/config', (c) => c.json({ enabled: getRobokassaConfig() !== null }))

export default app
