import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  type ProductInput,
} from '@/api/products'
import type { IProduct } from '@/types/product'
import { imageUrl } from '@/scripts/images'

// Отображаемая модель товара в CRM (плоская, готовая к рендеру таблицы/формы).
export type CrmProduct = {
  id: string
  name: string
  category: string // отображаемое имя категории (join)
  categoryId: string | null
  price: number
  stock: number
  isActive: boolean
  details: string // склеенная подпись для таблицы
  detailsMap: Record<string, string> // исходный объект (для формы)
  hue: number
  description: string
  images: string[] // пути картинок как их хранит БД (для показа — imageUrl())
}

export type DetailRow = { key: string; value: string }

// Черновик формы товара. Числовые поля — строками (как во вводе).
export type ProductDraft = {
  name: string
  description: string
  price: string
  stock: string
  categoryId: string
  details: DetailRow[]
  isActive: boolean
  imageFiles: File[] // новые файлы картинок
  existingImages: string[] // пути сохранённых картинок, которые остаются
}

// Палитра оттенков для плейсхолдер-обложек товаров.
export const HUES = [28, 92, 45, 200, 320, 15, 265, 60]

// Полосатая заглушка вместо реальной картинки товара.
export function swatch(hue: number): string {
  return `repeating-linear-gradient(45deg, oklch(0.86 0.03 ${hue}) 0 8px, oklch(0.81 0.035 ${hue}) 8px 16px)`
}

// Детерминированный оттенок из id — чтобы товар без картинки получал стабильную
// полосатую заглушку, а не «прыгал» при перерисовке.
function hueFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return HUES[h % HUES.length]
}

// details в БД — объект {ключ: значение}; для строки-подписи склеиваем значения.
function detailsToString(details: IProduct['details'] | undefined): string {
  if (!details) return ''
  return Object.values(details).filter(Boolean).join(' · ')
}

function fromApi(p: IProduct): CrmProduct {
  return {
    id: p._id,
    name: p.name,
    category: p.category ?? 'Без категории',
    categoryId: p.categoryId,
    price: p.price,
    stock: p.stock,
    isActive: p.isActive,
    details: detailsToString(p.details),
    detailsMap: p.details ?? {},
    hue: hueFromId(p._id),
    description: p.description ?? '',
    images: p.image ?? [],
  }
}

/** Обложка товара для списка — первая картинка галереи. */
export function coverUrl(product: CrmProduct): string | undefined {
  return imageUrl(product.images[0])
}

// Черновик формы → тело запроса (details-строки → объект, числа из строк).
function draftToInput(draft: ProductDraft): ProductInput {
  const details: Record<string, string> = {}
  for (const row of draft.details) {
    const key = row.key.trim()
    if (key) details[key] = row.value.trim()
  }
  return {
    name: draft.name.trim() || 'Без названия',
    price: parseInt(draft.price, 10) || 0,
    description: draft.description,
    categoryId: draft.categoryId,
    isActive: draft.isActive,
    stock: parseInt(draft.stock, 10) || 0,
    details,
    images: draft.imageFiles,
    existingImages: draft.existingImages,
  }
}

export const useProductsStore = defineStore('products', () => {
  const catalog = ref<CrmProduct[]>([])
  const loading = ref(false)
  const error = ref('')

  const productCountLabel = computed(
    () => `${catalog.value.length} товаров · ${catalog.value.filter((p) => p.isActive).length} активных`,
  )

  function countInCategory(categoryId: string): number {
    return catalog.value.filter((p) => p.categoryId === categoryId).length
  }

  // Загрузка списка товаров из БД. Вызывается при открытии CRM.
  async function loadProducts() {
    loading.value = true
    error.value = ''
    try {
      const list = await getProducts()
      catalog.value = list.map(fromApi)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить товары'
    } finally {
      loading.value = false
    }
  }

  // Создание (editingId === null) или обновление товара. После — перечитываем
  // список из БД, чтобы подтянуть join категории и итоговый URL картинки.
  async function saveProduct(draft: ProductDraft, editingId: string | null) {
    const input = draftToInput(draft)
    if (editingId) await apiUpdateProduct(editingId, input)
    else await apiCreateProduct(input)
    await loadProducts()
  }

  // Как и у категорий: удаление идёт из модалки, показать ошибку ей негде —
  // кладём в error, панель отрисует его вместо списка с кнопкой «Повторить».
  async function deleteProduct(id: string) {
    try {
      await apiDeleteProduct(id)
      await loadProducts()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось удалить товар'
    }
  }

  return {
    catalog,
    loading,
    error,
    productCountLabel,
    countInCategory,
    loadProducts,
    saveProduct,
    deleteProduct,
  }
})
