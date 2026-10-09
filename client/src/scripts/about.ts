/** Абзацы простого текста: разделитель — пустая строка (так же режет сервер для SEO). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/** Ссылка для звонка: из «+7 (999) 123-45-67» оставляем только цифры и плюс. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
