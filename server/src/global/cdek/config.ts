// Настройки доставки СДЭК. Всё живёт в .env: креды интеграции нужны только серверу
// (прокси к CDEK API), а город-отправитель, габариты и ключ Яндекс.Карт отдаются
// клиенту через GET /cdek/config — чтобы менять их без пересборки бандла.

/** Габариты и вес упаковки: см и граммы (как ждёт калькулятор CDEK). */
export type CdekParcel = {
  length: number
  width: number
  height: number
  weight: number
}

/** Креды интеграции — без них прокси работать не может. */
export type CdekCredentials = {
  account: string
  password: string
  apiUrl: string
}

/**
 * Отправитель для расчёта. Именно код города, а не название: калькулятор СДЭК
 * не резолвит `from_location` по строке адреса и отвечает на неё 400 — тарифы
 * считаются только по коду. Название нужно виджету для показа.
 */
export type CdekSender = {
  code: number
  city: string
}

/** Настройки виджета для браузера. Ключ Яндекса публичный (ограничивается доменом). */
export type CdekWidgetSettings = {
  apiKey: string
  from: CdekSender
  defaultLocation: string
  defaultParcel: CdekParcel
}

// Коробка по умолчанию — запасной вариант для товаров, у которых вес и габариты
// не заполнены (у товара свои поля, см. productSchema). Клиент собирает из этого
// посылку по составу корзины. Переопределяется через CDEK_PARCEL_*.
const DEFAULT_PARCEL: CdekParcel = { length: 20, width: 15, height: 10, weight: 500 }

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Креды и адрес API. null — интеграция не настроена, роуты отвечают 503. */
export function getCdekCredentials(): CdekCredentials | null {
  const { CDEK_ACCOUNT, CDEK_SECURE_PASSWORD } = process.env

  if (!CDEK_ACCOUNT || !CDEK_SECURE_PASSWORD) return null

  return {
    account: CDEK_ACCOUNT,
    password: CDEK_SECURE_PASSWORD,
    // По умолчанию боевой контур (как в эталонном service.php от СДЭК);
    // тестовый — https://api.edu.cdek.ru/v2.
    apiUrl: (process.env.CDEK_API_URL || 'https://api.cdek.ru/v2').replace(/\/+$/, ''),
  }
}

/**
 * Настройки виджета. null — виджет не показываем: без ключа Яндекс.Карт он не
 * нарисует карту, а без кода города-отправителя не посчитает стоимость (виджет
 * без цен бесполезен, поэтому лучше честно показать поле адреса).
 * Код города ищется через GET /cdek/service?action=cities&city=<название>.
 */
export function getCdekWidgetSettings(): CdekWidgetSettings | null {
  const { CDEK_YANDEX_MAPS_API_KEY, CDEK_FROM_CITY } = process.env
  const fromCityCode = Number(process.env.CDEK_FROM_CITY_CODE)

  if (!getCdekCredentials() || !CDEK_YANDEX_MAPS_API_KEY || !CDEK_FROM_CITY) return null
  if (!Number.isInteger(fromCityCode) || fromCityCode <= 0) return null

  return {
    apiKey: CDEK_YANDEX_MAPS_API_KEY,
    from: { code: fromCityCode, city: CDEK_FROM_CITY },
    // Город, который виджет показывает до выбора покупателя.
    defaultLocation: process.env.CDEK_DEFAULT_CITY || CDEK_FROM_CITY,
    defaultParcel: {
      length: readNumber(process.env.CDEK_PARCEL_LENGTH, DEFAULT_PARCEL.length),
      width: readNumber(process.env.CDEK_PARCEL_WIDTH, DEFAULT_PARCEL.width),
      height: readNumber(process.env.CDEK_PARCEL_HEIGHT, DEFAULT_PARCEL.height),
      weight: readNumber(process.env.CDEK_PARCEL_WEIGHT, DEFAULT_PARCEL.weight),
    },
  }
}
