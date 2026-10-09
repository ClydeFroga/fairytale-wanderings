import { Hono } from 'hono'
import { ProductMethods } from '@global/database/methods/product'
import { absoluteUrl, publicSiteUrl } from '@global/seo/config'

const app = new Hono()

app.get('/sitemap.xml', async (c) => {
  const origin = publicSiteUrl()
  const urls: string[] = []
  if (origin) {
    urls.push(origin + '/')
    urls.push(origin + '/about')
    const products = await ProductMethods.getList()
    for (const product of products) {
      urls.push(`${origin}/product/${product.slug}`)
    }
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((loc) => `  <url><loc>${loc}</loc></url>\n`).join('') +
    `</urlset>\n`

  return c.body(body, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  })
})

app.get('/robots.txt', (c) => {
  const sitemap = absoluteUrl('/sitemap.xml')
  const lines = ['User-agent: *', 'Allow: /']
  if (sitemap) lines.push(`Sitemap: ${sitemap}`)
  return c.text(lines.join('\n') + '\n', 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
})

export default app
