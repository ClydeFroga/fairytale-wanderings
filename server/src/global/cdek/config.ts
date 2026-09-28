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

/**
 * Какие тарифы показывать покупателю. Виджет фильтрует ответ калькулятора по
 * этим спискам: тариф попадёт на вкладку, только если его код там есть. Пустой
 * список — оставляем набор по умолчанию из самого виджета.
 */
export type CdekTariffs = {
  office?: number[] // выдача в ПВЗ
  door?: number[] // курьером до двери
}

/** Настройки виджета для браузера. Ключ Яндекса публичный (ограничивается доменом). */
export type CdekWidgetSettings = {
  apiKey: string
  from: CdekSender
  defaultLocation: string
  defaultParcel: CdekParcel
  tariffs: CdekTariffs
  doorDelivery: boolean // false — вкладки «курьером» в виджете не будет вовсе
}

// Коробка по умолчанию — запасной вариант для товаров, у которых вес и габариты
// не заполнены (у товара свои поля, см. productSchema). Клиент собирает из этого
// посылку по составу корзины. Переопределяется через CDEK_PARCEL_*.
const DEFAULT_PARCEL: CdekParcel = { length: 20, width: 15, height: 10, weight: 500 }

/**
 * Как называть тарифы покупателю: `136:Обычная,483:Экспресс`. Служебные имена
 * СДЭК («Посылка склад-склад») в витрине только путают — покупателю важны
 * скорость и цена, а не то, как магазин сдаёт посылку.
 */
export function getCdekTariffNames(): Map<number, string> {
  const names = new Map<number, string>()

  for (const pair of (process.env.CDEK_TARIFF_NAMES ?? '').split(',')) {
    const [rawCode, ...rest] = pair.split(':')
    const code = Number((rawCode ?? '').trim())
    const name = rest.join(':').trim()

    if (Number.isInteger(code) && code > 0 && name) names.set(code, name)
  }

  return names
}

/** Список кодов тарифов через запятую. Пусто или мусор — undefined (дефолт виджета). */
function readCodes(value: string | undefined): number[] | undefined {
  const codes = (value ?? '')
    .split(',')
    .map((code) => Number(code.trim()))
    .filter((code) => Number.isInteger(code) && code > 0)

  return codes.length ? codes : undefined
}

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

/** Код города-отправителя (CDEK_FROM_CITY_CODE). null — не задан или мусор. */
export function getCdekFromCityCode(): number | null {
  const code = Number(process.env.CDEK_FROM_CITY_CODE)
  return Number.isInteger(code) && code > 0 ? code : null
}

/** Разрешённые тарифы по вкладкам. undefined во вкладке — ограничений нет. */
export function getCdekTariffs(): CdekTariffs {
  return {
    office: readCodes(process.env.CDEK_TARIFFS_OFFICE),
    door: readCodes(process.env.CDEK_TARIFFS_DOOR),
  }
}

/** Коробка по умолчанию — для товаров без своих веса и габаритов. */
export function getCdekDefaultParcel(): CdekParcel {
  return {
    length: readNumber(process.env.CDEK_PARCEL_LENGTH, DEFAULT_PARCEL.length),
    width: readNumber(process.env.CDEK_PARCEL_WIDTH, DEFAULT_PARCEL.width),
    height: readNumber(process.env.CDEK_PARCEL_HEIGHT, DEFAULT_PARCEL.height),
    weight: readNumber(process.env.CDEK_PARCEL_WEIGHT, DEFAULT_PARCEL.weight),
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
  const fromCityCode = getCdekFromCityCode()

  if (!getCdekCredentials() || !CDEK_YANDEX_MAPS_API_KEY || !CDEK_FROM_CITY) return null
  if (fromCityCode === null) return null

  return {
    apiKey: CDEK_YANDEX_MAPS_API_KEY,
    from: { code: fromCityCode, city: CDEK_FROM_CITY },
    // Город, который виджет показывает до выбора покупателя.
    defaultLocation: process.env.CDEK_DEFAULT_CITY || CDEK_FROM_CITY,
    tariffs: getCdekTariffs(),
    // Курьерскую доставку можно выключить целиком: виджет не спрашивает
    // квартиру, а владелице удобнее отправлять только до пункта выдачи.
    doorDelivery: process.env.CDEK_DOOR_DELIVERY !== 'false',
    defaultParcel: getCdekDefaultParcel(),
  }
}
