import { apiClient } from '@/api/client'
import type { IProduct } from '@/types/product'

export type ProductListFilters = {
  name?: string
  category?: string // slug категории
}

export function getProducts(filters: ProductListFilters = {}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }

  const query = params.toString()
  const path = query ? `/products?${query}` : '/products'

  return apiClient.requestJson<IProduct[]>(path)
}

export function getProduct(id: string) {
  return apiClient.requestJson<IProduct>(`/products/${id}`)
}

/** Сколько картинок разрешено у товара (тот же лимит проверяет сервер). */
export const MAX_PRODUCT_IMAGES = 5

// Данные товара для создания/обновления. Уходят multipart-формой (из-за картинок).
export type ProductInput = {
  name: string
  price: number
  description: string
  categoryId: string
  isActive: boolean
  stock: number
  // Параметры посылки: вес в граммах, габариты в см. null очищает поле у товара —
  // тогда доставка считается по коробке по умолчанию (CDEK_PARCEL_* на сервере).
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  details: Record<string, string>
  images?: File[] // новые файлы — добавляются в конец галереи
  // Пути уже сохранённых картинок, которые остаются у товара (в нужном порядке).
  // Не передан — сервер оставляет всё как есть; пустой массив очищает галерею.
  existingImages?: string[]
}

// Пустая строка на сервере очищает колонку (см. routes/products/helpers.ts).
function setOptionalNumber(fd: FormData, key: string, value: number | null | undefined) {
  if (value === undefined) return
  fd.set(key, value === null ? '' : String(value))
}

function toFormData(input: Partial<ProductInput>): FormData {
  const fd = new FormData()
  if (input.name !== undefined) fd.set('name', input.name)
  if (input.price !== undefined) fd.set('price', String(input.price))
  if (input.description !== undefined) fd.set('description', input.description)
  if (input.categoryId !== undefined) fd.set('categoryId', input.categoryId)
  if (input.isActive !== undefined) fd.set('isActive', String(input.isActive))
  if (input.stock !== undefined) fd.set('stock', String(input.stock))
  setOptionalNumber(fd, 'weight', input.weight)
  setOptionalNumber(fd, 'length', input.length)
  setOptionalNumber(fd, 'width', input.width)
  setOptionalNumber(fd, 'height', input.height)
  if (input.details !== undefined) fd.set('details', JSON.stringify(input.details))
  if (input.existingImages !== undefined) {
    fd.set('existingImages', JSON.stringify(input.existingImages))
  }
  // Одноимённые поля — сервер (Hono) соберёт их в массив в порядке добавления.
  for (const file of input.images ?? []) fd.append('image', file)
  return fd
}

export function createProduct(input: ProductInput) {
  return apiClient.requestJson<IProduct>('/products', { method: 'POST', body: toFormData(input) })
}

export function updateProduct(id: string, input: Partial<ProductInput>) {
  return apiClient.requestJson<IProduct>(`/products/${id}`, {
    method: 'PATCH',
    body: toFormData(input),
  })
}

export function deleteProduct(id: string) {
  return apiClient.requestJson<{ message: string }>(`/products/${id}`, { method: 'DELETE' })
}
