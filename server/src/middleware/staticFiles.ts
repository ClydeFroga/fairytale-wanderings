import type { MiddlewareHandler } from 'hono'
import path from 'node:path'
import { Upload } from '@global/utils/upload'

// Собранный клиент и картинки товаров раздаёт тот же сервер, что и API: домен у
// магазина всё равно один (его же открывает Mini App), а отдельный nginx для
// одного сайта — лишняя деталь в деплое.
//
// Пути считаем от файла модуля, а не от cwd, чтобы сервер одинаково работал и из
// корня репозитория (`bun run start`), и из папки server (`bun run dev`).
const CLIENT_DIST = path.resolve(
  process.env.CLIENT_DIST || path.join(import.meta.dir, '../../../client/dist'),
)

const INDEX_HTML = path.join(CLIENT_DIST, 'index.html')

/**
 * Отдаёт файл из `root`, если он там есть; иначе передаёт запрос дальше — на
 * API-роуты или на SPA-фоллбэк. Выход за пределы каталога через `..` отсекаем.
 */
function serveFrom(root: string, cacheControl: (relative: string) => string): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return next()

    let relative: string
    try {
      relative = decodeURIComponent(new URL(c.req.url).pathname).replace(/^\/+/, '')
    } catch {
      return next() // битый percent-encoding — файлом это точно не является
    }

    // Каталог (в том числе корень сайта) — это index.html внутри него.
    if (relative === '' || relative.endsWith('/')) relative += 'index.html'

    const fullPath = path.resolve(root, relative)
    if (fullPath !== root && !fullPath.startsWith(root + path.sep)) return next()

    const file = Bun.file(fullPath)
    if (!(await file.exists())) return next()

    // Content-Type и Content-Length Bun выставляет по самому файлу.
    return new Response(file, { headers: { 'Cache-Control': cacheControl(relative) } })
  }
}

/** Картинки товаров: в БД пути относительные (`images/x.webp`), корень — UPLOAD_PATH. */
export const serveUploads = serveFrom(Upload.rootDir, () => 'public, max-age=2592000')

/**
 * Файлы сборки клиента. Имена в `assets/` хешированы — их можно кэшировать
 * навсегда, а index.html ссылается на них и потому не кэшируется совсем: иначе
 * после деплоя браузер ещё какое-то время просил бы уже удалённые файлы.
 */
export const serveClient = serveFrom(CLIENT_DIST, (relative) => {
  if (relative.startsWith('assets/')) return 'public, max-age=31536000, immutable'
  if (relative.endsWith('index.html')) return 'no-cache'
  return 'public, max-age=3600'
})

/**
 * SPA-фоллбэк: `/admin`, `/product/:id` и остальные роуты vue-router существуют
 * только в браузере, на сервере им соответствует один index.html (без этого
 * Mini App открывался бы на 404 сервера). Отдаём его только на навигационные
 * запросы — промах по API должен остаться 404, а не превратиться в HTML.
 */
export const serveClientIndex: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'GET') return next()
  if (!c.req.header('accept')?.includes('text/html')) return next()

  const index = Bun.file(INDEX_HTML)
  if (!(await index.exists())) return next() // клиент не собран — в dev его отдаёт vite

  // index.html ссылается на хешированные файлы, поэтому сам не кэшируется.
  return new Response(index, { headers: { 'Cache-Control': 'no-cache' } })
}
