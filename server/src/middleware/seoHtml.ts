import type { MiddlewareHandler } from 'hono'
import { AboutPageMethods } from '@global/database/methods/aboutPage'
import { ShopTermsMethods } from '@global/database/methods/shopTerms'
import { ProductMethods } from '@global/database/methods/product'
import {
  DEFAULT_OG_PATH,
  SHOP_DESCRIPTION,
  SHOP_NAME,
  absoluteUrl,
} from '@global/seo/config'
import {
  aboutCrawlerBlock,
  crawlerBlock,
  escapeHtml,
  injectSeoHtml,
  productJsonLd,
  termsCrawlerBlock,
  textDescription,
  textParagraphs,
  type SeoDocument,
} from '@global/seo/html'
import { matchSeoPath } from '@global/seo/page'
import { isUuid } from '@global/utils/isUuid'
import { INDEX_HTML } from './staticFiles'
import { wantsHtml } from './wantsHtml'

export { wantsHtml }

export function htmlHeaders(noindex: boolean): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  }
  if (noindex) headers['X-Robots-Tag'] = 'noindex'
  return headers
}

const shopCrawlerHtml = `<div class="seo-crawler" style="display:none"><h1>${escapeHtml(SHOP_NAME)}</h1><p>${escapeHtml(SHOP_DESCRIPTION)}</p></div>`

function shopDocument(opts: {
  noindex: boolean
  canonicalPath: string
  crawlerHtml: string
}): SeoDocument {
  return {
    title: SHOP_NAME,
    description: SHOP_DESCRIPTION,
    canonicalPath: opts.canonicalPath,
    noindex: opts.noindex,
    ogImagePath: absoluteUrl(DEFAULT_OG_PATH),
    jsonLd: null,
    crawlerHtml: opts.crawlerHtml,
  }
}

function notFoundDocument(pathname: string): SeoDocument {
  return {
    title: `Страница не найдена — ${SHOP_NAME}`,
    description: SHOP_DESCRIPTION,
    canonicalPath: pathname.replace(/\/+$/, '') || '/',
    noindex: true,
    ogImagePath: absoluteUrl(DEFAULT_OG_PATH),
    jsonLd: null,
    crawlerHtml: `<div class="seo-crawler" style="display:none"><h1>Страница не найдена</h1></div>`,
  }
}

function productDocument(row: {
  name: string
  description: string
  image: string[]
  price: number
  stock: number
  slug: string
}): SeoDocument {
  const images = row.image.map((src) => absoluteUrl(src)).filter((src): src is string => !!src)
  const cover = images[0] ?? absoluteUrl(DEFAULT_OG_PATH)
  const path = `/product/${row.slug}`
  const pageUrl = absoluteUrl(path) ?? path
  return {
    title: `${row.name} — ${SHOP_NAME}`,
    description: row.description || SHOP_DESCRIPTION,
    canonicalPath: path,
    noindex: false,
    ogImagePath: cover,
    jsonLd: productJsonLd({
      name: row.name,
      description: row.description,
      images,
      price: row.price,
      stock: row.stock,
      url: pageUrl,
    }),
    crawlerHtml: crawlerBlock({
      name: row.name,
      description: row.description,
      price: row.price,
      imageUrl: cover,
    }),
  }
}

const ABOUT_DEFAULT_TITLE = 'Обо мне'

// Страница видна и пустой: без заголовка — «Обо мне», без текста — описание
// магазина, без фото — общая обложка.
function aboutDocument(about: { title: string; body: string; images: string[] }): SeoDocument {
  const heading = about.title || ABOUT_DEFAULT_TITLE
  const cover =
    about.images.map((src) => absoluteUrl(src)).find((src): src is string => !!src) ??
    absoluteUrl(DEFAULT_OG_PATH)
  return {
    title: `${heading} — ${SHOP_NAME}`,
    description: textDescription(about.body) || SHOP_DESCRIPTION,
    canonicalPath: '/about',
    noindex: false,
    ogImagePath: cover,
    jsonLd: null,
    crawlerHtml: aboutCrawlerBlock({ title: heading, paragraphs: textParagraphs(about.body) }),
  }
}

const TERMS_TITLE = 'Оплата, доставка и возврат'
const TERMS_DESCRIPTION = 'Как оплатить заказ, условия доставки СДЭК и возврата, контакты продавца.'

// Тексты условий пишет владелица, а заголовок и описание постоянные: страница
// одна и та же, меняются только формулировки внутри.
function termsDocument(terms: {
  paymentText: string
  deliveryText: string
  returnsText: string
}): SeoDocument {
  return {
    title: `${TERMS_TITLE} — ${SHOP_NAME}`,
    description: TERMS_DESCRIPTION,
    canonicalPath: '/terms',
    noindex: false,
    ogImagePath: absoluteUrl(DEFAULT_OG_PATH),
    jsonLd: null,
    crawlerHtml: termsCrawlerBlock({
      title: 'Покупателям',
      sections: [
        { heading: 'Оплата', text: terms.paymentText },
        { heading: 'Доставка', text: terms.deliveryText },
        { heading: 'Возврат и обмен', text: terms.returnsText },
      ],
    }),
  }
}

async function defaultRead(): Promise<string | null> {
  const file = Bun.file(INDEX_HTML)
  if (!(await file.exists())) return null
  return file.text()
}

/**
 * SPA-фоллбэк: `/admin`, `/product/:slug` и остальные роуты vue-router существуют
 * только в браузере, на сервере им соответствует один index.html (без этого
 * Mini App открывался бы на 404 сервера). Отдаём его только на навигационные
 * запросы — промах по API должен остаться 404, а не превратиться в HTML.
 * Перед отдачей подставляем title/OG/JSON-LD и скрытый блок для краулеров.
 */
export function createServeClientIndex(
  readIndex: () => Promise<string | null>,
): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method !== 'GET') return next()
    if (!wantsHtml(c.req.header('accept'))) return next()

    const index = await readIndex()
    if (index == null) return next()

    const url = new URL(c.req.url)
    const page = matchSeoPath(url.pathname, url.search)
    const pathname = url.pathname.replace(/\/+$/, '') || '/'

    let doc: SeoDocument
    let status = 200

    if (page.type === 'home') {
      doc = shopDocument({
        noindex: page.noindex,
        canonicalPath: '/',
        crawlerHtml: shopCrawlerHtml,
      })
    } else if (page.type === 'utility') {
      doc = shopDocument({
        noindex: true,
        canonicalPath: pathname,
        crawlerHtml: '',
      })
    } else if (page.type === 'missing') {
      doc = notFoundDocument(pathname)
      status = 404
    } else if (page.type === 'about') {
      try {
        const about = await AboutPageMethods.get()
        doc = aboutDocument(about ?? { title: '', body: '', images: [] })
      } catch (error) {
        console.error('SEO: не удалось прочитать страницу «Обо мне»', error)
        return new Response(index, { headers: htmlHeaders(false) })
      }
    } else if (page.type === 'terms') {
      try {
        const terms = await ShopTermsMethods.get()
        doc = termsDocument(terms ?? { paymentText: '', deliveryText: '', returnsText: '' })
      } catch (error) {
        console.error('SEO: не удалось прочитать страницу «Покупателям»', error)
        return new Response(index, { headers: htmlHeaders(false) })
      }
    } else {
      try {
        const row = isUuid(page.param)
          ? await ProductMethods.getById(page.param)
          : await ProductMethods.getBySlug(page.param)
        if (!row || !row.isActive) {
          doc = notFoundDocument(pathname)
          status = 404
        } else if (isUuid(page.param) && row.slug !== page.param) {
          return c.redirect(`/product/${row.slug}`, 301)
        } else {
          doc = productDocument(row)
        }
      } catch (error) {
        console.error('SEO: не удалось прочитать товар', error)
        return new Response(index, { headers: htmlHeaders(false) })
      }
    }

    return new Response(injectSeoHtml(index, doc), {
      status,
      headers: htmlHeaders(doc.noindex),
    })
  }
}

export const serveClientIndex = createServeClientIndex(defaultRead)
