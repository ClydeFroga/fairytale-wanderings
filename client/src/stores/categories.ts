import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getCategories, type ICategory } from '@/api/categories'
import { useProductsStore } from '@/stores/products'

// ВНИМАНИЕ: список категорий CRM (`categories`) — пока локальные демо-данные:
// добавление/удаление живёт на клиенте, серверного CRUD категорий ещё нет.
// `apiCategories` — реальные категории из БД, нужны форме товара (уходит categoryId).

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<string[]>([
    'Кухня',
    'Игрушки',
    'Аксессуары',
    'Декор',
    'Керамика',
    'Украшения',
  ])

  const apiCategories = ref<ICategory[]>([])

  const categoryCountLabel = computed(() => `${categories.value.length} категорий`)

  function countInCategory(name: string): number {
    return useProductsStore().countInCategory(name)
  }

  async function loadCategories() {
    try {
      apiCategories.value = await getCategories()
    } catch {
      // не критично для показа товаров — форма просто останется без списка
    }
  }

  // true — если название непустое и такой категории ещё нет (без учёта регистра).
  function canAddCategory(name: string): boolean {
    const v = name.trim()
    return !!v && !categories.value.some((c) => c.toLowerCase() === v.toLowerCase())
  }

  function addCategory(name: string) {
    const v = name.trim()
    if (!canAddCategory(v)) return
    categories.value.push(v)
  }

  // Удаляем категорию, а её товары переводим в «Без категории».
  function deleteCategory(name: string) {
    categories.value = categories.value.filter((c) => c !== name)
    useProductsStore().detachCategory(name)
  }

  return {
    categories,
    apiCategories,
    categoryCountLabel,
    countInCategory,
    loadCategories,
    canAddCategory,
    addCategory,
    deleteCategory,
  }
})
