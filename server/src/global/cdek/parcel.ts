import type { CdekParcel } from './config'

// Серверная копия client/src/scripts/parcel.ts: по ней сервер пересчитывает
// цену доставки, которую видел покупатель. Алгоритм менять синхронно с клиентом —
// разойдутся, и покупатель будет получать DELIVERY_PRICE_CHANGED.

/** Товар заказа: вес в граммах, габариты в см в упакованном виде (могут быть не заполнены). */
export type ParcelItem = {
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  quantity: number
}

/**
 * Одна коробка на весь заказ. Вес и объём складываются; коробка не меньше самого
 * крупного товара, недостающий объём добирается длиной.
 */
export function buildParcels(items: ParcelItem[], fallback: CdekParcel): CdekParcel[] {
  if (items.length === 0) return [fallback]

  let weight = 0
  let volume = 0
  let length = 0
  let width = 0
  let height = 0

  for (const item of items) {
    const itemLength = item.length ?? fallback.length
    const itemWidth = item.width ?? fallback.width
    const itemHeight = item.height ?? fallback.height

    weight += (item.weight ?? fallback.weight) * item.quantity
    volume += itemLength * itemWidth * itemHeight * item.quantity

    length = Math.max(length, itemLength)
    width = Math.max(width, itemWidth)
    height = Math.max(height, itemHeight)
  }

  const base = width * height
  if (base > 0) length = Math.max(length, Math.ceil(volume / base))

  return [{ length, width, height, weight: Math.round(weight) }]
}
