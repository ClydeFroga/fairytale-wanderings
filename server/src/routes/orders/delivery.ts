import { calculateTariffList, getOfficeByCode } from '@global/cdek/api'
import {
  getCdekCredentials,
  getCdekDefaultParcel,
  getCdekFromCityCode,
  getCdekTariffs,
} from '@global/cdek/config'
import { buildParcels, type ParcelItem } from '@global/cdek/parcel'
import {
  CdekNotConfiguredError,
  DeliveryAddressMismatchError,
  DeliveryPointNotFoundError,
  DeliveryPriceChangedError,
  InvalidTariffError,
} from '@global/errors'

// Цену доставки считает сервер: она входит в сумму к оплате, а присланную
// браузером можно подделать. Запрос в калькулятор повторяет тот, что шлёт виджет
// СДЭК (currency, lang, from/to, packages), поэтому цены совпадают.

/** Адрес курьерской доставки — ровно то, что виджет отдаёт в калькулятор. */
export type DeliveryLocation = {
  address: string
  postal_code?: string | null
  country_code?: string
}

export type DeliveryInput = {
  deliveryMethod?: 'cdek_office' | 'cdek_door' | 'manual'
  deliveryAddress?: string
  deliveryPointCode?: string
  deliveryTariffCode?: number
  deliveryPrice?: number
  deliveryLocation?: DeliveryLocation
}

const CDEK_CURRENCY_RUB = 1 // так же кодирует рубли виджет

// delivery_mode тарифа СДЭК, подходящие способу: курьер везёт до двери
// (1 дверь-дверь, 3 склад-дверь), ПВЗ — до склада (2 дверь-склад, 4 склад-склад).
const MODES: Record<'cdek_office' | 'cdek_door', number[]> = {
  cdek_door: [1, 3],
  cdek_office: [2, 4],
}

/**
 * Курьеру уходит адрес заказа, а цена посчитана до адреса из виджета — они
 * должны совпадать. Клиент дописывает только квартиру: `<адрес>, кв. <N>`
 * (client/src/stores/cart.ts, deliveryPayload).
 */
function matchesQuotedAddress(deliveryAddress: string, quotedAddress: string): boolean {
  const quoted = quotedAddress.trim()
  return deliveryAddress.trim() === quoted || deliveryAddress.startsWith(`${quoted}, кв. `)
}

/**
 * Серверная цена доставки в рублях. null — не СДЭК (ручной адрес): доставка
 * в сумму не входит. Цена не совпала с показанной покупателю — 409 со свежей.
 */
export async function quoteDelivery(input: DeliveryInput, items: ParcelItem[]): Promise<number | null> {
  const method = input.deliveryMethod
  if (method !== 'cdek_office' && method !== 'cdek_door') return null

  const fromCode = getCdekFromCityCode()
  if (!getCdekCredentials() || fromCode === null) throw new CdekNotConfiguredError()

  const tariffCode = input.deliveryTariffCode
  const allowed = getCdekTariffs()[method === 'cdek_office' ? 'office' : 'door']
  if (!tariffCode || (allowed && !allowed.includes(tariffCode))) {
    throw new InvalidTariffError(tariffCode)
  }

  let toLocation: Record<string, unknown>
  if (method === 'cdek_office') {
    const code = input.deliveryPointCode ?? ''
    const office = await getOfficeByCode(code)
    if (!office) throw new DeliveryPointNotFoundError(code)
    toLocation = { code: office.city_code }
  } else {
    const location = input.deliveryLocation!
    if (!matchesQuotedAddress(input.deliveryAddress ?? '', location.address)) {
      throw new DeliveryAddressMismatchError()
    }
    toLocation = {
      address: location.address,
      postal_code: location.postal_code ?? undefined,
      country_code: location.country_code,
    }
  }

  const quotes = await calculateTariffList({
    currency: CDEK_CURRENCY_RUB,
    lang: 'rus',
    from_location: { code: fromCode },
    to_location: toLocation,
    packages: buildParcels(items, getCdekDefaultParcel()),
  })

  const quote = quotes.find((q) => q.tariff_code === tariffCode)
  // Пустой CDEK_TARIFFS_* пропускает любой тариф — режим доставки не даёт
  // посчитать курьера по дешёвому тарифу до ПВЗ и наоборот.
  if (!quote || (quote.delivery_mode !== undefined && !MODES[method].includes(quote.delivery_mode))) {
    throw new InvalidTariffError(tariffCode)
  }

  // Копейки в заказе не храним — виджет на клиенте округляет так же.
  const price = Math.round(quote.delivery_sum)
  if (price !== input.deliveryPrice) throw new DeliveryPriceChangedError(price)

  return price
}
