export type SeoPage =
  | { type: 'home'; noindex: boolean }
  | { type: 'product'; param: string }
  | { type: 'utility' }
  | { type: 'about' }
  | { type: 'missing' }

export function matchSeoPath(pathname: string, search: string): SeoPage {
  const path = pathname.replace(/\/+$/, '') || '/'
  const query = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(query)

  if (path === '/') {
    return { type: 'home', noindex: [...params.keys()].length > 0 }
  }
  if (path === '/cart' || path === '/admin' || path.startsWith('/order/')) {
    return { type: 'utility' }
  }
  if (path === '/about') {
    return { type: 'about' }
  }
  const match = path.match(/^\/product\/([^/]+)$/)
  if (match?.[1]) {
    try {
      return { type: 'product', param: decodeURIComponent(match[1]) }
    } catch {
      return { type: 'missing' }
    }
  }
  return { type: 'missing' }
}
