import type { CdekParcel } from '@/api/cdek'
import type { CartItem } from '@/stores/cart'

// Сборка посылки для расчёта доставки. СДЭК считает по максимуму из физического
// и объёмного веса (Д×Ш×В / 5000 кг), поэтому габариты для вязаных игрушек важны
// не меньше веса: лёгкая, но объёмная игрушка тарифицируется по объёму.

/**
 * Одна коробка на весь заказ — владелица пакует заказ вместе, а СДЭК
 * тарифицирует по местам. Вес складываем, объём тоже; коробка при этом не может
 * быть меньше самого крупного товара, а недостающий объём добираем длиной.
 * У товаров без своих параметров берётся коробка по умолчанию с сервера.
 */
export function buildParcels(items: CartItem[], fallback: CdekParcel): CdekParcel[] {
  if (items.length === 0) return [fallback]

  let weight = 0
  let volume = 0
  let length = 0
  let width = 0
  let height = 0

  for (const { product, quantity } of items) {
    const itemLength = product.length ?? fallback.length
    const itemWidth = product.width ?? fallback.width
    const itemHeight = product.height ?? fallback.height

    weight += (product.weight ?? fallback.weight) * quantity
    volume += itemLength * itemWidth * itemHeight * quantity

    length = Math.max(length, itemLength)
    width = Math.max(width, itemWidth)
    height = Math.max(height, itemHeight)
  }

  const base = width * height
  if (base > 0) length = Math.max(length, Math.ceil(volume / base))

  return [{ length, width, height, weight: Math.round(weight) }]
}
