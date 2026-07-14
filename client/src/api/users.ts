import { apiClient } from '@/api/client'
import { getInitData } from '@/scripts/telegram'

export type MeProfile = {
  telegramId: number
  firstName: string
  lastName: string | null
  phone: string | null
}

/** Профиль текущего Telegram-пользователя. null, если мы не внутри Телеграма. */
export function getMe(): Promise<MeProfile | null> {
  const initData = getInitData()
  if (!initData) return Promise.resolve(null)

  return apiClient.requestJson<MeProfile>('/users/me', {
    headers: { Authorization: `tma ${initData}` },
  })
}
