import { ROOT_URL } from '@/config'

// Картинки товара хранятся относительными путями («images/x.webp») и раздаются
// сервером API, а не фронтом. Абсолютные URL (сид на picsum) оставляем как есть.
export function imageUrl(src?: string | null): string | undefined {
  if (!src) return undefined
  if (/^https?:\/\//.test(src)) return src
  return `${ROOT_URL}/${src.replace(/^\/+/, '')}`
}

/** Все картинки товара как готовые URL (пустые значения отбрасываем). */
export function imageUrls(sources: string[] | undefined): string[] {
  return (sources ?? []).map(imageUrl).filter((url): url is string => !!url)
}
