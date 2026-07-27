import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getCategories,
  createCategory as apiCreateCategory,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
  type ICategory,
} from '@/api/categories'
import { useProductsStore } from '@/stores/products'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<ICategory[]>([])
  const loading = ref(false)
  const error = ref('')

  const categoryCountLabel = computed(() => {
    const n = categories.value.length
    if (n === 1) return '1 категория'
    if (n >= 2 && n <= 4) return `${n} категории`
    return `${n} категорий`
  })

  function countInCategory(id: string): number {
    return useProductsStore().countInCategory(id)
  }

  async function loadCategories() {
    loading.value = true
    error.value = ''
    try {
      categories.value = await getCategories()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить категории'
    } finally {
      loading.value = false
    }
  }

  // Дубли ловит и сервер (409), но пустое/повторное название отсекаем сразу —
  // чтобы кнопка «Добавить» была неактивна, а не выдавала ошибку по клику.
  function canAddCategory(name: string): boolean {
    const value = name.trim()
    return !!value && !categories.value.some((c) => c.name.toLowerCase() === value.toLowerCase())
  }

  async function addCategory(name: string) {
    const created = await apiCreateCategory({ name: name.trim() })
    categories.value = [...categories.value, created]
  }

  async function renameCategory(id: string, name: string) {
    const updated = await apiUpdateCategory(id, { name: name.trim() })
    categories.value = categories.value.map((c) => (c.id === id ? updated : c))
  }

  // Товары удалённой категории не пропадают — сервер обнуляет им categoryId,
  // поэтому список товаров перечитываем, чтобы CRM показала «Без категории».
  // Удаление запускается из модалки в CRMView, ей некуда показать ошибку —
  // поэтому сбой кладём в error (панель покажет его с кнопкой «Повторить»).
  async function deleteCategory(id: string) {
    try {
      await apiDeleteCategory(id)
      categories.value = categories.value.filter((c) => c.id !== id)
      await useProductsStore().loadProducts()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось удалить категорию'
    }
  }

  return {
    categories,
    loading,
    error,
    categoryCountLabel,
    countInCategory,
    loadCategories,
    canAddCategory,
    addCategory,
    renameCategory,
    deleteCategory,
  }
})
