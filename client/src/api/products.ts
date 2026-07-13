import { apiClient } from '@/api/client'
import type { IProduct } from '@/components/product/IProduct'

export type ProductListFilters = {
  name?: string
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
