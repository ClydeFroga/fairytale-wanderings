import { apiClient } from '@/api/client'
import { getInitData } from '@/scripts/telegram'

export type AdminProfile = {
  telegramId: number
  firstName: string
  isAdmin: true
}

/**
 * Вход в админку: сервер проверяет initData Mini App, сверяет права и ставит
 * httpOnly-куку сессии (она нужна потому, что initData живёт всего час).
 * Возвращает null, если мы не внутри Телеграма — там initData взять негде.
 * Не админ → 403, поддельная initData → 401 (ApiError).
 */
export function loginAdmin(): Promise<AdminProfile | null> {
  if (!getInitData()) return Promise.resolve(null)

  return apiClient.requestJson<AdminProfile>('/auth/login', { method: 'POST' })
}

export function logoutAdmin() {
  return apiClient.requestJson<{ message: string }>('/auth/logout', { method: 'POST' })
}
