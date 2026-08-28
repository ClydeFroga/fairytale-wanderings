import { Hono } from 'hono'
import { calculate, getCities, getOffices } from '@global/cdek/api'
import { getCdekWidgetSettings } from '@global/cdek/config'
import { AppError } from '@global/errors'

// Эндпоинты виджета ПВЗ СДЭК. `/service` — это то, что виджет знает как
// servicePath: он сам ходит сюда за списком ПВЗ и расчётом тарифов, а креды
// интеграции остаются на сервере (см. global/cdek/api.ts).
const app = new Hono()

/** Настройки виджета для браузера. enabled: false — интеграция не настроена. */
app.get('/config', (c) => {
  const settings = getCdekWidgetSettings()
  if (!settings) return c.json({ enabled: false as const })

  return c.json({ enabled: true as const, ...settings })
})

// Список ПВЗ. Фильтры (город, тип точки, оплата картой) и постраничность
// формирует сам виджет — просто передаём их в СДЭК.
app.get('/service', async (c) => {
  const params = new URLSearchParams(new URL(c.req.url).search)
  const action = params.get('action')
  params.delete('action')

  // Справочник городов виджет не запрашивает — он нужен при настройке магазина,
  // чтобы найти код города-отправителя (см. CDEK_FROM_CITY_CODE).
  if (action === 'cities') {
    const { body } = await getCities(params)

    return c.body(body, 200, { 'Content-Type': 'application/json' })
  }

  if (action !== 'offices') {
    throw new AppError('Неизвестное действие', 400, 'CDEK_UNKNOWN_ACTION')
  }

  const { body, totalElements } = await getOffices(params)

  return c.body(body, 200, {
    'Content-Type': 'application/json',
    // По нему виджет считает количество страниц ПВЗ (в dev нужен ещё и
    // exposeHeaders в CORS — API и сайт на разных портах).
    ...(totalElements ? { 'X-Total-Elements': totalElements } : {}),
  })
})

// Расчёт тарифов до выбранной точки: виджет шлёт сюда упаковку, откуда и куда.
app.post('/service', async (c) => {
  const payload = await c.req.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('Некорректный запрос', 400, 'CDEK_BAD_REQUEST')
  }

  const { action, ...rest } = payload as Record<string, unknown>
  if (action !== 'calculate') {
    throw new AppError('Неизвестное действие', 400, 'CDEK_UNKNOWN_ACTION')
  }

  const { body } = await calculate(rest)

  return c.body(body, 200, { 'Content-Type': 'application/json' })
})

export default app
