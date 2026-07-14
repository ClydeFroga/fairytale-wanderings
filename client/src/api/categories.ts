import { apiClient } from '@/api/client'

export type ICategory = {
  id: string
  name: string
  slug: string
  sortOrder: number
}

export function getCategories() {
  return apiClient.requestJson<ICategory[]>('/categories')
}
