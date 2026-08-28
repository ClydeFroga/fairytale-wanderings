import { describe, expect, it, beforeAll, beforeEach, afterAll, spyOn } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createApp } from '../../app'
import { resetDatabase } from '../../test/e2e/db'
import type { IProduct } from '@global/database/shema'
import { ProductMethods } from '@global/database/methods/product'
import { createServeClientIndex } from '../../middleware/seoHtml'
import { serveClient } from '../../middleware/staticFiles'
import { adminHeaders } from '../../test/e2e/auth'

process.env.PUBLIC_SITE_URL = 'http://localhost:3000'

const FIXTURE = `<!doctype html><html><head><title>Сказка странствий</title><meta name="description" content="def"><!--seo-head--></head><body><div id="app"><!--seo-body--></div></body></html>`

function htmlApp() {
  const app = createApp()
  app.use(
    '/*',
    createServeClientIndex(async () => FIXTURE),
  )
  return app
}

async function hideProduct(id: string) {
  const form = new FormData()
  form.set('isActive', 'false')
  await createApp().fetch(
    new Request(`http://localhost/products/${id}`, {
      method: 'PATCH',
      body: form,
      headers: adminHeaders(),
    }),
  )
}

describe('SEO HTML / sitemap', () => {
  let products: IProduct[]
  const app = htmlApp()

  beforeEach(async () => {
    products = await resetDatabase()
  })

  function htmlGet(path: string) {
    return app.fetch(
      new Request(`http://localhost${path}`, {
        headers: { accept: 'text/html' },
      }),
    )
  }

  it('GET /sitemap.xml — главная и активные товары, без скрытых', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    await hideProduct(teddy._id)

    const res = await createApp().fetch(new Request('http://localhost/sitemap.xml'))
    const xml = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/xml')
    expect(xml).toContain('http://localhost:3000/</loc>')
    expect(xml).not.toContain(`/product/${teddy.slug}`)
    const blanket = products.find((p) => p.name.startsWith('Плед'))!
    expect(xml).toContain(`/product/${blanket.slug}`)
  })

  it('GET /robots.txt — Allow и Sitemap, без /admin', async () => {
    const res = await createApp().fetch(new Request('http://localhost/robots.txt'))
    const body = await res.text()
    expect(res.status).toBe(200)
    expect(body).toContain('Allow: /')
    expect(body).toContain('Sitemap: http://localhost:3000/sitemap.xml')
    expect(body).not.toContain('admin')
  })

  it('HTML /product/<slug> — 200, title, h1, json-ld, og:image', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    const res = await htmlGet(`/product/${teddy.slug}`)
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain(`${teddy.name} — Сказка странствий`)
    expect(html).toContain(`<h1>${teddy.name}</h1>`)
    expect(html).toContain('application/ld+json')
    expect(html).toContain('og:image')
    expect(html).toContain(String(teddy.price))
  })

  it('HTML скрытого и несуществующего товара — 404', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    await hideProduct(teddy._id)

    expect((await htmlGet(`/product/${teddy.slug}`)).status).toBe(404)
    expect((await htmlGet('/product/net-takogo')).status).toBe(404)
  })

  it('HTML /product/<uuid> активного — 301 на slug', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    const res = await htmlGet(`/product/${teddy._id}`)

    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe(`/product/${teddy.slug}`)
  })

  it('HTML uuid скрытого — 404, не редирект', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    await hideProduct(teddy._id)
    expect((await htmlGet(`/product/${teddy._id}`)).status).toBe(404)
  })

  it('главная с ?category= — noindex и canonical на /', async () => {
    const res = await htmlGet('/?category=toys')
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(res.headers.get('x-robots-tag')).toBe('noindex')
    expect(html).toContain('name="robots" content="noindex"')
    expect(html).toContain('rel="canonical" href="http://localhost:3000/"')
  })

  it('карточка с utm — canonical без noindex', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    const res = await htmlGet(`/product/${teddy.slug}?utm=tg`)
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(res.headers.get('x-robots-tag')).toBeNull()
    expect(html).not.toContain('noindex')
    expect(html).toContain(`rel="canonical" href="http://localhost:3000/product/${teddy.slug}"`)
  })

  it('/admin и /cart — 200 и X-Robots-Tag noindex', async () => {
    const admin = await htmlGet('/admin')
    const cart = await htmlGet('/cart')
    expect(admin.status).toBe(200)
    expect(cart.status).toBe(200)
    expect(admin.headers.get('x-robots-tag')).toBe('noindex')
    expect(cart.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('GET / с Accept */* — 200 и canonical', async () => {
    const res = await app.fetch(
      new Request('http://localhost/', { headers: { accept: '*/*' } }),
    )
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('rel="canonical"')
  })

  it('GET / без Accept — 200 и canonical', async () => {
    const res = await app.fetch(new Request('http://localhost/'))
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('rel="canonical"')
  })

  it('GET / с Accept application/json не отдаёт инжект HTML', async () => {
    const res = await app.fetch(
      new Request('http://localhost/', { headers: { accept: 'application/json' } }),
    )
    const body = await res.text()
    expect(res.status).not.toBe(200)
    expect(body).not.toContain('rel="canonical"')
  })

  it('карточка с Accept */* — 200 и title товара', async () => {
    const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
    const res = await app.fetch(
      new Request(`http://localhost/product/${teddy.slug}`, {
        headers: { accept: '*/*' },
      }),
    )
    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain(`${teddy.name} — Сказка странствий`)
  })

  it('ошибка БД на карточке — 200 HTML с Content-Type, сырой index', async () => {
    const spy = spyOn(ProductMethods, 'getBySlug').mockImplementation(() => {
      throw new Error('db down')
    })
    try {
      const teddy = products.find((p) => p.name === 'Вязаный мишка Тедди')!
      const res = await htmlGet(`/product/${teddy.slug}`)
      const html = await res.text()
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/html')
      expect(html).toContain('<!--seo-head-->')
    } finally {
      spy.mockRestore()
    }
  })
})

describe('SEO HTML через serveClient + serveClientIndex', () => {
  let distDir: string
  let prevClientDist: string | undefined
  let app: ReturnType<typeof createApp>

  beforeAll(() => {
    distDir = mkdtempSync(path.join(tmpdir(), 'seo-dist-'))
    writeFileSync(path.join(distDir, 'index.html'), FIXTURE)
    prevClientDist = process.env.CLIENT_DIST
    process.env.CLIENT_DIST = distDir

    app = createApp()
    app.use('/*', serveClient)
    app.use(
      '/*',
      createServeClientIndex(async () => FIXTURE),
    )
  })

  afterAll(() => {
    if (prevClientDist === undefined) delete process.env.CLIENT_DIST
    else process.env.CLIENT_DIST = prevClientDist
    rmSync(distDir, { recursive: true, force: true })
  })

  function htmlGet(path: string) {
    return app.fetch(
      new Request(`http://localhost${path}`, {
        headers: { accept: 'text/html' },
      }),
    )
  }

  it('GET / и /?category=toys инжектят SEO, а не сырой index.html', async () => {
    const home = await htmlGet('/')
    const homeHtml = await home.text()
    expect(home.status).toBe(200)
    expect(homeHtml).toContain('<title>Сказка странствий</title>')
    expect(homeHtml).toContain('rel="canonical" href="http://localhost:3000/"')
    expect(homeHtml).not.toContain('<!--seo-head-->')

    const filtered = await htmlGet('/?category=toys')
    const filteredHtml = await filtered.text()
    expect(filtered.status).toBe(200)
    expect(filteredHtml).toContain('name="robots" content="noindex"')
    expect(filteredHtml).toContain('rel="canonical" href="http://localhost:3000/"')
  })
})
