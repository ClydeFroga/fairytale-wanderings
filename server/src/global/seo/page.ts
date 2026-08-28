export type SeoPage =
  | { type: 'home'; noindex: boolean }
  | { type: 'product'; param: string }
  | { type: 'utility' }
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
  const match = path.match(/^\/product\/([^/]+)$/)
  if (match?.[1]) {
    return { type: 'product', param: decodeURIComponent(match[1]) }
  }
  return { type: 'missing' }
}
