// Тонкая обёртка над Telegram WebApp SDK (скрипт подключён в index.html).
// Вне Телеграма window.Telegram отсутствует или initData пустая — тогда всё это no-op.

interface TelegramWebApp {
  initData: string
  initDataUnsafe: Record<string, unknown>
  colorScheme?: 'light' | 'dark'
  ready: () => void
  expand: () => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}

/** Сырая initData для отправки на бэкенд. undefined, если мы не внутри Телеграма. */
export function getInitData(): string | undefined {
  const data = getTelegramWebApp()?.initData
  return data && data.length > 0 ? data : undefined
}

export function isTelegram(): boolean {
  return getInitData() !== undefined
}

/** Сообщаем Телеграму, что приложение готово, и разворачиваем на весь экран. */
export function initTelegram(): void {
  const webApp = getTelegramWebApp()
  if (!webApp) return

  webApp.ready()
  webApp.expand()
}
