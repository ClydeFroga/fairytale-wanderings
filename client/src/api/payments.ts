import { apiClient } from '@/api/client'

/** Включена ли онлайн-оплата: от этого зависит текст кнопки в корзине. */
export function getPaymentConfig() {
  return apiClient.requestJson<{ enabled: boolean }>('/payments/config')
}
