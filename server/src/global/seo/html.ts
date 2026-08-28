import { absoluteUrl, SHOP_NAME } from './config'

export type SeoDocument = {
  title: string
  description: string
  canonicalPath: string
  noindex: boolean
  ogImagePath: string | null
  jsonLd: string | null
  crawlerHtml: string
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function productJsonLd(input: {
  name: string
  description: string
  images: string[]
  price: number
  stock: number
  url: string
}): string {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    image: input.images,
    offers: {
      '@type': 'Offer',
      price: String(input.price),
      priceCurrency: 'RUB',
      availability:
        input.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: input.url,
    },
  }
  return JSON.stringify(payload).replaceAll('<', '\\u003c')
}

export function crawlerBlock(input: {
  name: string
  description: string
  price: number
  imageUrl: string | null
}): string {
  const img = input.imageUrl
    ? `<img src="${escapeHtml(input.imageUrl)}" alt="${escapeHtml(input.name)}">`
    : ''
  return `<div class="seo-crawler" style="display:none"><h1>${escapeHtml(input.name)}</h1><p>${input.price} ₽</p><p>${escapeHtml(input.description)}</p>${img}</div>`
}

function extraHead(doc: SeoDocument): string {
  const parts: string[] = []
  const canonical = absoluteUrl(doc.canonicalPath)
  if (canonical) {
    parts.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`)
    parts.push(`<meta property="og:url" content="${escapeHtml(canonical)}">`)
  }
  parts.push(`<meta property="og:title" content="${escapeHtml(doc.title)}">`)
  parts.push(`<meta property="og:description" content="${escapeHtml(doc.description)}">`)
  if (doc.ogImagePath) {
    parts.push(`<meta property="og:image" content="${escapeHtml(doc.ogImagePath)}">`)
  }
  parts.push(`<meta name="twitter:card" content="summary_large_image">`)
  if (doc.noindex) {
    parts.push(`<meta name="robots" content="noindex">`)
  }
  if (doc.jsonLd) {
    parts.push(`<script type="application/ld+json">${doc.jsonLd}</script>`)
  }
  return parts.join('')
}

export function injectSeoHtml(indexHtml: string, doc: SeoDocument): string {
  let html = indexHtml
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(doc.title)}</title>`)
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeHtml(doc.description)}">`,
  )
  html = html.replace('<!--seo-head-->', extraHead(doc))
  html = html.replace('<!--seo-body-->', doc.crawlerHtml)
  return html
}

export { SHOP_NAME }
