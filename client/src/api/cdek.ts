import { apiClient } from '@/api/client'
import { ROOT_URL } from '@/config'

// Виджет ПВЗ СДЭК ходит за данными не в СДЭК напрямую, а в наш сервер: креды
// интеграции должны остаться на бэкенде (см. server/src/routes/cdek).

/** Габариты (см) и вес (г) упаковки — по ним виджет считает стоимость. */
export type CdekParcel = {
  length: number
  width: number
  height: number
  weight: number
}

/**
 * Отправитель: код города СДЭК и название. Именно код — калькулятор СДЭК не
 * считает тарифы по строке адреса (отвечает 400).
 */
export type CdekSender = {
  code: number
  city: string
}

/** Настройки виджета с сервера. Меняются в .env, без пересборки клиента. */
export type CdekSettings = {
  apiKey: string // ключ Яндекс.Карт — виджет рисует на них карту ПВЗ
  from: CdekSender
  defaultLocation: string // город, который показываем до выбора покупателя
  // Коробка для товаров, у которых вес и габариты не заполнены.
  defaultParcel: CdekParcel
}

export type CdekConfig = ({ enabled: true } & CdekSettings) | { enabled: false }

/** Адрес, который виджет знает как servicePath (ПВЗ и расчёт тарифов). */
export const CDEK_SERVICE_PATH = `${ROOT_URL}/cdek/service`

export function getCdekConfig() {
  return apiClient.requestJson<CdekConfig>('/cdek/config')
}

// Пакет @cdek-it/widget не экспортирует типы своих колбэков — описываем то,
// что реально используем в onChoose.

/** Тариф, выбранный покупателем: стоимость в рублях, срок — в днях. */
export type CdekTariff = {
  tariff_code: number
  tariff_name: string
  period_min: number
  period_max: number
  delivery_sum: number
}

/** Пункт выдачи или постамат. */
export type CdekOffice = {
  code: string
  name: string
  address: string
  city: string
}

/** Адрес для курьерской доставки — приходит из геокодера Яндекса. */
export type CdekGeoTarget = {
  formatted: string
}
