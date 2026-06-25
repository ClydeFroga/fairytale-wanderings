import { DatabaseSingleton } from '@global/database/DatabaseSingleton'
import { Bot } from './bot/main'
import { serveStatic } from 'hono/bun'
import { createServerApp } from './app'

const app = createServerApp()

await DatabaseSingleton.getInstance().connect()

async function startBot() {
  try {
    console.log('Запуск приложения...')

    const bot = new Bot(process.env.BOT_TOKEN || '')

    await bot.start()

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))

    console.log('Приложение полностью запущено и готово к работе!')
  } catch (error) {
    console.error('Критическая ошибка при запуске приложения:', error)
    process.exit(1)
  }
}

// startBot().catch((error) => {
//   console.error("Необработанная ошибка при запуске:", error);
// });

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
