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
  deliveryPointCode?: string
  deliveryTariffCode?: number
  deliveryPrice?: number
  deliveryLocation?: DeliveryLocation
}

const CDEK_CURRENCY_RUB = 1 // так же кодирует рубли виджет

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
  if (!quote) throw new InvalidTariffError(tariffCode)

  // Копейки в заказе не храним — виджет на клиенте округляет так же.
  const price = Math.round(quote.delivery_sum)
  if (price !== input.deliveryPrice) throw new DeliveryPriceChangedError(price)

  return price
}
