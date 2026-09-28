import { DatabaseSingleton } from '@global/database/DatabaseSingleton'
import { warnIfMissingPublicSiteUrl } from '@global/seo/config'
import { startPaymentExpiry } from '@global/payments/expireOrders'
import { Bot } from './bot/main'
import { createServerApp } from './app'
import { serveClient, serveUploads } from './middleware/staticFiles'
import { serveClientIndex } from './middleware/seoHtml'

const app = createServerApp()

await DatabaseSingleton.getInstance().connect()
warnIfMissingPublicSiteUrl()

// Отмена неоплаченных заказов по сроку — возвращает товар на склад.
startPaymentExpiry()

async function startBot() {
  const token = process.env.BOT_TOKEN
  if (!token) {
    console.warn('BOT_TOKEN не задан — Telegram-бот не запущен')
    return
  }

  try {
    const bot = new Bot(token)
    await bot.start()

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
  } catch (error) {
    // Ошибка бота не должна ронять HTTP-API — просто логируем.
    console.error('Не удалось запустить Telegram-бота:', error)
  }
}

startBot()

// Статика регистрируется после API-роутов: совпавший роут отвечает сам, а всё
// остальное сначала ищется на диске и в последнюю очередь отдаётся как index.html.
app.use('/images/*', serveUploads)
app.use('/*', serveClient)
app.use('/*', serveClientIndex)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
