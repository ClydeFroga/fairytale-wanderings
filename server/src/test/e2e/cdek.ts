// Подмена CDEK API в E2E: ходить в настоящий СДЭК из тестов нельзя. Подменяется
// глобальный fetch, приложение работает по-настоящему. Токен и ПВЗ кэшируются
// в модуле api.ts — поэтому у тестов, где важен ответ ПВЗ, свои коды точек.

export const CDEK_ENV_KEYS = [
  'CDEK_ACCOUNT',
  'CDEK_SECURE_PASSWORD',
  'CDEK_API_URL',
  'CDEK_FROM_CITY_CODE',
  'CDEK_TARIFFS_OFFICE',
  'CDEK_TARIFFS_DOOR',
  'CDEK_PARCEL_LENGTH',
  'CDEK_PARCEL_WIDTH',
  'CDEK_PARCEL_HEIGHT',
  'CDEK_PARCEL_WEIGHT',
]

export type StubCall = { url: string; init: RequestInit | undefined }

const realFetch = globalThis.fetch

export function setCdekEnv(extra: Record<string, string> = {}) {
  process.env.CDEK_ACCOUNT = 'orders-account'
  process.env.CDEK_SECURE_PASSWORD = 'secret'
  process.env.CDEK_API_URL = 'https://api.edu.cdek.ru/v2'
  process.env.CDEK_FROM_CITY_CODE = '44'
  Object.assign(process.env, extra)
}

export function clearCdekEnv() {
  for (const key of CDEK_ENV_KEYS) delete process.env[key]
}

export function restoreFetch() {
  globalThis.fetch = realFetch
}

type CdekStubOptions = {
  // Код ПВЗ → код города. Точки с кодом, начинающимся на MISSING, «не существуют».
  cityCode?: number
  tariffs?: Array<{ tariff_code: number; delivery_sum: number; delivery_mode?: number }>
  calculatorStatus?: number
}

/** Подменяет fetch ответами СДЭК: токен, ПВЗ по коду, калькулятор. */
export function stubCdek(options: CdekStubOptions = {}): StubCall[] {
  const calls: StubCall[] = []
  // delivery_mode: 4 — склад-склад (до ПВЗ), 3 — склад-дверь (курьер).
  const tariffs = options.tariffs ?? [
    { tariff_code: 136, delivery_sum: 350.4, delivery_mode: 4 },
    { tariff_code: 483, delivery_sum: 600, delivery_mode: 4 },
    { tariff_code: 137, delivery_sum: 520, delivery_mode: 3 },
    { tariff_code: 482, delivery_sum: 800, delivery_mode: 3 },
  ]

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push({ url, init })

    if (url.includes('/oauth/token')) {
      return Response.json({ access_token: 'test-token', expires_in: 3600 })
    }

    if (url.includes('/deliverypoints')) {
      const code = new URL(url).searchParams.get('code') ?? ''
      if (code.startsWith('MISSING')) return Response.json([])
      return Response.json([{ code, city_code: options.cityCode ?? 270, city: 'Новосибирск' }])
    }

    if (url.includes('/calculator/tarifflist')) {
      if (options.calculatorStatus && options.calculatorStatus !== 200) {
        return new Response('boom', { status: options.calculatorStatus })
      }
      return Response.json({
        tariff_codes: tariffs.map((t) => ({
          ...t,
          tariff_name: `Тариф ${t.tariff_code}`,
          period_min: 2,
          period_max: 4,
        })),
      })
    }

    return new Response('not found', { status: 404 })
  }) as typeof fetch

  return calls
}
