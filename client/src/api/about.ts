import { apiClient } from '@/api/client'

/** Сколько фото и ссылок разрешено (те же лимиты проверяет сервер). */
export const MAX_ABOUT_IMAGES = 5
export const MAX_SELLER_LINKS = 5

export type SellerLink = { label: string; url: string }

export type AboutContent = { title: string; body: string; images: string[] }

export type SellerInfo = {
  fullName: string
  inn: string
  phone: string
  email: string
  links: SellerLink[]
}

export type AboutData = { about: AboutContent; seller: SellerInfo }

// Форма уходит целиком: сервер трактует непришедшее поле как пустое.
export type AboutInput = {
  title: string
  body: string
  existingImages: string[] // пути оставленных фото в нужном порядке
  images: File[] // новые файлы — добавляются в конец галереи
  seller: SellerInfo
}

export function getAbout() {
  return apiClient.requestJson<AboutData>('/content/about')
}

export function saveAbout(input: AboutInput) {
  const fd = new FormData()
  fd.set('title', input.title)
  fd.set('body', input.body)
  fd.set('existingImages', JSON.stringify(input.existingImages))
  // Одноимённые поля — сервер (Hono) соберёт их в массив в порядке добавления.
  for (const file of input.images) fd.append('image', file)
  fd.set('fullName', input.seller.fullName)
  fd.set('inn', input.seller.inn)
  fd.set('phone', input.seller.phone)
  fd.set('email', input.seller.email)
  fd.set('links', JSON.stringify(input.seller.links))
  return apiClient.requestJson<AboutData>('/content/about', { method: 'PATCH', body: fd })
}
