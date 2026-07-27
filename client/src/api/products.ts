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

// Данные товара для создания/обновления. Уходят multipart-формой (из-за картинки).
export type ProductInput = {
  name: string
  price: number
  description: string
  categoryId: string
  isActive: boolean
  stock: number
  details: Record<string, string>
  image?: File | null // новый файл; при обновлении без файла картинка сохраняется
}

function toFormData(input: Partial<ProductInput>): FormData {
  const fd = new FormData()
  if (input.name !== undefined) fd.set('name', input.name)
  if (input.price !== undefined) fd.set('price', String(input.price))
  if (input.description !== undefined) fd.set('description', input.description)
  if (input.categoryId !== undefined) fd.set('categoryId', input.categoryId)
  if (input.isActive !== undefined) fd.set('isActive', String(input.isActive))
  if (input.stock !== undefined) fd.set('stock', String(input.stock))
  if (input.details !== undefined) fd.set('details', JSON.stringify(input.details))
  if (input.image) fd.set('image', input.image)
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
