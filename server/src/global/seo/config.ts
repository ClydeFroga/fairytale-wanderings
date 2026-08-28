export const SHOP_NAME = 'Сказка странствий'
export const SHOP_DESCRIPTION = 'Вязаные игрушки и вещи ручной работы.'
export const THEME_COLOR = '#e88630'
export const DEFAULT_OG_PATH = '/og.jpg'

export function publicSiteUrl(): string | null {
  const raw = process.env.PUBLIC_SITE_URL?.trim()
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

export function warnIfMissingPublicSiteUrl(): void {
  if (!publicSiteUrl()) {
    console.warn('PUBLIC_SITE_URL не задан — абсолютные canonical/og:image/sitemap не собрать')
  }
}

/** Абсолютный URL для OG/canonical. Уже абсолютный путь (http…) возвращаем как есть. */
export function absoluteUrl(pathOrUrl: string): string | null {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = publicSiteUrl()
  if (!base) return null
  return `${base}/${pathOrUrl.replace(/^\/+/, '')}`
}
