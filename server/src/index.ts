import { DatabaseSingleton } from '@global/database/DatabaseSingleton'
import { Bot } from './bot/main'
import { serveStatic } from 'hono/bun'
import { createServerApp } from './app'

const app = createServerApp()

await DatabaseSingleton.getInstance().connect()

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

app.use(
  '/images/*',
  serveStatic({
    root: 'test_uploads',
    onNotFound: (filePath, c) => {
      console.log(`${filePath} is not found, you access ${c.req.path}`)
    },
  }),
)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
