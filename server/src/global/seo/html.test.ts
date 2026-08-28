import { describe, expect, it } from 'bun:test'
import { escapeHtml, injectSeoHtml } from './html'
import type { SeoDocument } from './html'

process.env.PUBLIC_SITE_URL = 'http://localhost:3000'

const INDEX = `<!doctype html><html><head><title>Сказка странствий</title><meta name="description" content="def"><!--seo-head--></head><body><div id="app"><!--seo-body--></div></body></html>`

describe('escapeHtml', () => {
  it('экранирует теги в названии товара', () => {
    expect(escapeHtml(`<b>"x"</b>`)).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;')
  })
})

describe('injectSeoHtml', () => {
  it('подставляет title, canonical, noindex и блок в #app', () => {
    const doc: SeoDocument = {
      title: 'Лиса — Сказка странствий',
      description: 'Игрушка',
      canonicalPath: '/product/lisa',
      noindex: false,
      ogImagePath: 'http://localhost:3000/images/x.webp',
      jsonLd: `{"@type":"Product","name":"Лиса"}`,
      crawlerHtml: `<div class="seo-crawler" style="display:none"><h1>Лиса</h1></div>`,
    }
    const html = injectSeoHtml(INDEX, doc)
    expect(html).toContain('<title>Лиса — Сказка странствий</title>')
    expect(html).toContain('content="Игрушка"')
    expect(html).toContain('rel="canonical" href="http://localhost:3000/product/lisa"')
    expect(html).toContain('seo-crawler')
    expect(html).toContain('application/ld+json')
    expect(html).not.toContain('noindex')
  })

  it('для noindex пишет meta robots и не оставляет плейсхолжеры', () => {
    const doc: SeoDocument = {
      title: 'Сказка странствий',
      description: 'def',
      canonicalPath: '/',
      noindex: true,
      ogImagePath: null,
      jsonLd: null,
      crawlerHtml: '',
    }
    const html = injectSeoHtml(INDEX, doc)
    expect(html).toContain('name="robots" content="noindex"')
    expect(html).not.toContain('<!--seo-head-->')
    expect(html).not.toContain('<!--seo-body-->')
  })
})
