import { Telegraf } from 'telegraf'
import { StartListener } from './listeners/StartListener'
import { PhoneListener } from './listeners/PhoneListener'
import { AdminListener } from './listeners/AdminListener'
import type { Listener } from './listeners/Listener'
import { webAppUrl } from '@global/telegram/webAppUrl'

class Bot {
  private bot: Telegraf

  constructor(botToken: string) {
    this.bot = new Telegraf(botToken)
  }

  async start() {
    try {
      console.log('Запуск бота Telegram...')

      // Хендлеры регистрируем до старта поллинга.
      this.startListeners()
      await this.setMenuButton()

      // launch() резолвится только при остановке бота — не ждём его здесь.
      this.bot.launch()

      console.log('Бот запущен успешно')
    } catch (error) {
      console.error('Критическая ошибка при старте бота:', error)
      throw error
    }
  }

  stop(reason: string) {
    this.bot.stop(reason)
  }

  // Постоянная кнопка меню (рядом с полем ввода) — открывает магазин как Mini App.
  // Она общая для всех чатов; вход в админку — отдельная кнопка и команда /admin.
  private async setMenuButton() {
    const url = webAppUrl()
    if (!url) return

    try {
      await this.bot.telegram.setChatMenuButton({
        menuButton: { type: 'web_app', text: 'Магазин', web_app: { url } },
      })
    } catch (error) {
      console.warn('Не удалось установить кнопку меню (проверьте, что WEBAPP_URL — https):', error)
    }
  }

  private createListeners(): Listener[] {
    return [new StartListener(this.bot), new PhoneListener(this.bot), new AdminListener(this.bot)]
  }

  private startListeners() {
    this.createListeners().forEach((listener) => {
      listener.init()
    })
  }
}

export { Bot }
