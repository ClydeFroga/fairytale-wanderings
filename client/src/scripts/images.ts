import { ROOT_URL } from '@/config'

// Картинки товара хранятся относительными путями («images/x.webp») и раздаются
// сервером API, а не фронтом. Абсолютные URL (сид на picsum) оставляем как есть.
export function imageUrl(src?: string | null): string | undefined {
  if (!src) return undefined
  if (/^https?:\/\//.test(src)) return src
  return `${ROOT_URL}/${encodePath(src.replace(/^\/+/, ''))}`
}

// Старые загрузки хранят исходное имя файла — с пробелами, скобками и кириллицей.
// Адрес уходит в CSS url(...) без кавычек, где пробел или скобка его обрывают,
// поэтому кодируем всё, включая скобки и апостроф (encodeURI их не трогает).
function encodePath(path: string): string {
  return encodeURI(path).replace(
    /[()']/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

/** Все картинки товара как готовые URL (пустые значения отбрасываем). */
export function imageUrls(sources: string[] | undefined): string[] {
  return (sources ?? []).map(imageUrl).filter((url): url is string => !!url)
}
