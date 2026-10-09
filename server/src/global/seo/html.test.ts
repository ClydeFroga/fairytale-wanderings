import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { aboutCrawlerBlock, escapeHtml, injectSeoHtml, textDescription, textParagraphs } from './html'
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

  it('не портит title и description с символами $$ и $&', () => {
    const doc: SeoDocument = {
      title: 'Товар $$ $& — Сказка странствий',
      description: 'Цена $$',
      canonicalPath: '/product/sale',
      noindex: false,
      ogImagePath: null,
      jsonLd: null,
      crawlerHtml: `<div class="seo-crawler" style="display:none"><h1>Товар $$ $&</h1></div>`,
    }
    const html = injectSeoHtml(INDEX, doc)
    expect(html).toContain('<title>Товар $$ $&amp; — Сказка странствий</title>')
    expect(html).toContain('content="Цена $$"')
    expect(html).toContain('<h1>Товар $$ $&</h1>')
  })

  it('в реальном client/index.html оставляет один набор OG с данными товара', async () => {
    const indexPath = join(import.meta.dir, '../../../../client/index.html')
    const realIndex = await Bun.file(indexPath).text()
    const doc: SeoDocument = {
      title: 'Лиса — Сказка странствий',
      description: 'Игрушка',
      canonicalPath: '/product/lisa',
      noindex: false,
      ogImagePath: 'http://localhost:3000/images/x.webp',
      jsonLd: null,
      crawlerHtml: '',
    }
    const html = injectSeoHtml(realIndex, doc)

    expect(html).toContain('property="og:title" content="Лиса — Сказка странствий"')
    expect(html).toContain('property="og:image" content="http://localhost:3000/images/x.webp"')
    expect(html).not.toMatch(/property="og:title"[^>]*content="Сказка странствий"/)
    expect(html).not.toContain('content="/og.jpg"')
    expect((html.match(/property="og:title"/g) ?? []).length).toBe(1)
    expect((html.match(/property="og:image"/g) ?? []).length).toBe(1)
    expect((html.match(/property="og:description"/g) ?? []).length).toBe(1)
    expect((html.match(/name="twitter:card"/g) ?? []).length).toBe(1)
    expect(html).toContain('property="og:type" content="website"')
  })
})

describe('textDescription', () => {
  it('короткий текст — как есть, переводы строк и пробелы схлопнуты', () => {
    expect(textDescription('Раз.\n\n  Два.')).toBe('Раз. Два.')
  })

  it('длинный текст обрезается по слову и получает многоточие', () => {
    const text = 'слово '.repeat(60)
    const result = textDescription(text)
    expect(result.length).toBeLessThanOrEqual(161)
    expect(result.endsWith('слово…')).toBe(true)
  })

  it('текст без пробелов режется ровно по лимиту', () => {
    expect(textDescription('я'.repeat(300))).toBe('я'.repeat(160) + '…')
  })

  it('текст ровно на лимите не обрезается', () => {
    expect(textDescription('я'.repeat(160))).toBe('я'.repeat(160))
  })

  it('пустой текст — пустая строка', () => {
    expect(textDescription('  \n ')).toBe('')
  })
})

describe('textParagraphs', () => {
  it('делит по пустой строке, одиночный перенос остаётся внутри абзаца', () => {
    expect(textParagraphs('Раз\nстрока\n\n\nДва\n  \nТри')).toEqual(['Раз\nстрока', 'Два', 'Три'])
  })
})

describe('aboutCrawlerBlock', () => {
  it('экранирует заголовок и абзацы', () => {
    const html = aboutCrawlerBlock({ title: '<b>Я</b>', paragraphs: ['<script>alert(1)</script>'] })
    expect(html).toContain('<h1>&lt;b&gt;Я&lt;/b&gt;</h1>')
    expect(html).toContain('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
    expect(html).not.toContain('<script>')
  })
})
