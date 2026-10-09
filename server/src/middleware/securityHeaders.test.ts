import { describe, expect, it } from 'bun:test'
import { createServerApp } from '../app'

const app = createServerApp()

describe('защитные заголовки', () => {
  it('ставятся на ответы API', async () => {
    const res = await app.request('/categories')

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=15552000')
  })

  it('ставятся и на 404', async () => {
    const res = await app.request('/no-such-route', { headers: { Accept: 'application/json' } })

    expect(res.status).toBe(404)
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('разрешают встраивание в Telegram Web, а не только SAMEORIGIN', async () => {
    const res = await app.request('/categories')

    expect(res.headers.get('X-Frame-Options')).toBeNull()
    expect(res.headers.get('Content-Security-Policy')).toBe(
      "frame-ancestors 'self' https://*.telegram.org",
    )
  })

  it('не мешают картинкам с соседнего порта и рефереру для ключа Яндекс.Карт', async () => {
    const res = await app.request('/categories')

    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-site')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })
})
