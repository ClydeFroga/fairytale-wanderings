import { apiClient } from '@/api/client'

export type ICategory = {
  id: string
  name: string
  slug: string
  sortOrder: number
}

// Slug сервер делает сам из названия и не меняет при переименовании — на него
// завязаны ссылки витрины (`/?category=<slug>`).
export type CategoryInput = {
  name: string
  sortOrder?: number
}

export function getCategories() {
  return apiClient.requestJson<ICategory[]>('/categories')
}

export function createCategory(input: CategoryInput) {
  return apiClient.requestJson<ICategory>('/categories', { method: 'POST', body: input })
}

export function updateCategory(id: string, input: Partial<CategoryInput>) {
  return apiClient.requestJson<ICategory>(`/categories/${id}`, { method: 'PATCH', body: input })
}

export function deleteCategory(id: string) {
  return apiClient.requestJson<{ message: string }>(`/categories/${id}`, { method: 'DELETE' })
}
