import { CdekApiError, CdekNotConfiguredError } from '@global/errors'
import { getCdekCredentials, type CdekCredentials } from './config'

// Прокси к CDEK API 2.0 для виджета ПВЗ. Креды интеграции живут только здесь:
// в браузер уходит лишь адрес нашего эндпоинта (см. routes/cdek).
// Протокол повторяет эталонный service.php из пакета @cdek-it/widget:
//   action=offices   → GET  /deliverypoints  (виджет читает X-Total-Elements)
//   action=calculate → POST /calculator/tarifflist

/** Ответ СДЭК как есть: тело не разбираем, виджет ждёт оригинальный JSON. */
export type CdekProxyResponse = {
  body: string
  totalElements: string | null
}

// СДЭК считает по этим заголовкам обращения виджета — оставляем как в service.php.
const CLIENT_HEADERS = {
  Accept: 'application/json',
  'X-App-Name': 'widget_pvz',
  'X-App-Version': '3.11.1',
}

const TOKEN_EXPIRY_GAP_MS = 60_000 // обновляем токен чуть раньше срока
const OFFICES_TTL_MS = 10 * 60_000 // список ПВЗ меняется редко
const OFFICES_CACHE_LIMIT = 50

// Токен живёт около часа; на каждый запрос виджета его перезапрашивать не нужно.
// Ключ — аккаунт и контур, чтобы смена кредов не переиспользовала старый токен.
let cachedToken: { key: string; value: string; expiresAt: number } | null = null

const officesCache = new Map<string, { value: CdekProxyResponse; expiresAt: number }>()

function requireCredentials(): CdekCredentials {
  const credentials = getCdekCredentials()
  if (!credentials) throw new CdekNotConfiguredError()
  return credentials
}

async function fetchToken(credentials: CdekCredentials): Promise<string> {
  const response = await fetch(`${credentials.apiUrl}/oauth/token`, {
    method: 'POST',
    headers: { ...CLIENT_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.account,
      client_secret: credentials.password,
    }),
  })

  if (!response.ok) {
    console.error('CDEK: не удалось получить токен:', response.status, await response.text())
    throw new CdekApiError(response.status)
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new CdekApiError(response.status)

  const key = `${credentials.apiUrl}|${credentials.account}`
  const lifetimeMs = (data.expires_in ?? 3600) * 1000
  cachedToken = {
    key,
    value: data.access_token,
    expiresAt: Date.now() + Math.max(lifetimeMs - TOKEN_EXPIRY_GAP_MS, 0),
  }

  return data.access_token
}

async function getToken(credentials: CdekCredentials): Promise<string> {
  const key = `${credentials.apiUrl}|${credentials.account}`
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }
  return fetchToken(credentials)
}

/**
 * Запрос к CDEK с токеном. На 401 токен сбрасывается и запрос повторяется один
 * раз: токен мог протухнуть раньше срока (например, при перевыпуске кредов).
 */
async function request(
  path: string,
  init: { method: 'GET' | 'POST'; query?: URLSearchParams; json?: unknown },
  retryOnUnauthorized = true,
): Promise<CdekProxyResponse> {
  const credentials = requireCredentials()
  const token = await getToken(credentials)

  const url = `${credentials.apiUrl}/${path}${init.query ? `?${init.query}` : ''}`
  const response = await fetch(url, {
    method: init.method,
    headers: {
      ...CLIENT_HEADERS,
      Authorization: `Bearer ${token}`,
      ...(init.json === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  })

  if (response.status === 401 && retryOnUnauthorized) {
    cachedToken = null
    return request(path, init, false)
  }

  if (!response.ok) {
    console.error('CDEK: ошибка запроса', path, response.status, await response.text())
    throw new CdekApiError(response.status)
  }

  return {
    body: await response.text(),
    // Виджет по этому заголовку понимает, сколько страниц ПВЗ грузить.
    totalElements: response.headers.get('x-total-elements'),
  }
}

/** Список ПВЗ и постаматов. Кэшируется: виджет тянет его страницами при каждом открытии. */
export async function getOffices(params: URLSearchParams): Promise<CdekProxyResponse> {
  params.sort()
  const key = params.toString()

  const cached = officesCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const result = await request('deliverypoints', { method: 'GET', query: params })

  // Кэш маленький и без вытеснения по возрасту — при переполнении чистим целиком.
  if (officesCache.size >= OFFICES_CACHE_LIMIT) officesCache.clear()
  officesCache.set(key, { value: result, expiresAt: Date.now() + OFFICES_TTL_MS })

  return result
}

/**
 * Справочник городов СДЭК. Виджету не нужен — это разовая настройка: по нему
 * находят код города-отправителя для CDEK_FROM_CITY_CODE.
 */
export function getCities(params: URLSearchParams): Promise<CdekProxyResponse> {
  return request('location/cities', { method: 'GET', query: params })
}

/** Расчёт тарифов до выбранной точки. Не кэшируем — зависит от адреса и упаковки. */
export function calculate(payload: unknown): Promise<CdekProxyResponse> {
  return request('calculator/tarifflist', { method: 'POST', json: payload })
}

export type CdekOfficeInfo = { code: string; city_code: number }
// delivery_mode: 1 дверь-дверь, 2 дверь-склад, 3 склад-дверь, 4 склад-склад,
// 6 дверь-постамат, 7 склад-постамат. В старых ответах его может не быть.
export type CdekTariffQuote = { tariff_code: number; delivery_sum: number; delivery_mode?: number }

function parseJson<T>(body: string): T {
  try {
    return JSON.parse(body) as T
  } catch {
    console.error('CDEK: не удалось разобрать ответ', body.slice(0, 200))
    throw new CdekApiError(200)
  }
}

// Точка в ответе /deliverypoints: город вложен в location (виджет читает так же —
// formatOffices в @cdek-it/widget берёт e.location.city_code).
type CdekDeliveryPoint = { code: string; location?: { city_code?: number } }

/** ПВЗ по коду — нужен код его города для расчёта на сервере. Через кэш списка ПВЗ. */
export async function getOfficeByCode(code: string): Promise<CdekOfficeInfo | null> {
  const { body } = await getOffices(new URLSearchParams({ code }))
  const list = parseJson<CdekDeliveryPoint[]>(body)
  if (!Array.isArray(list)) return null

  const point = list.find((office) => office.code === code)
  const cityCode = point?.location?.city_code
  // Без кода города цену не посчитать — для заказа такая точка всё равно что не найдена.
  if (!point || typeof cityCode !== 'number') return null

  return { code: point.code, city_code: cityCode }
}

/** Калькулятор для сервера: только коды тарифов и цены. */
export async function calculateTariffList(payload: unknown): Promise<CdekTariffQuote[]> {
  const { body } = await calculate(payload)
  const parsed = parseJson<{ tariff_codes?: CdekTariffQuote[] }>(body)

  return Array.isArray(parsed.tariff_codes) ? parsed.tariff_codes : []
}
