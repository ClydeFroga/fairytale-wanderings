import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { IProduct } from '@/types/product'
import type { StockShortage } from '@/api/orders'
import { getProduct } from '@/api/products'

export interface CartItem {
  product: IProduct
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  // Ключуем по _id, а не по объекту: в разных местах приходят разные экземпляры
  // товара (из списка, со страницы товара, после перезагрузки остатков).
  const entriesById = ref<Map<string, CartItem>>(new Map())
  const address = ref('')
  const name = ref('')
  const phone = ref('')
  const email = ref('')
  const showValidationErrors = ref(false)
  const orderError = ref('')
  const insufficientProductIds = ref<Set<string>>(new Set())

  const items = computed(() => Array.from(entriesById.value.values()))

  const isAddressValid = computed(() => address.value.trim().length > 0)
  const isNameValid = computed(() => name.value.trim().length > 0)
  const isPhoneValid = computed(() => /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone.value))
  // Почта необязательна (телефон уже есть), но заполненную проверяем на формат.
  const isEmailValid = computed(
    () => email.value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()),
  )
  const isOrderFormValid = computed(
    () => isAddressValid.value && isNameValid.value && isPhoneValid.value && isEmailValid.value,
  )

  const totalQuantity = computed(() =>
    items.value.reduce((acc, { quantity }) => acc + quantity, 0),
  )

  const totalPrice = computed(() =>
    items.value.reduce((acc, { product, quantity }) => acc + product.price * quantity, 0),
  )

  function isInsufficient(product: IProduct) {
    return insufficientProductIds.value.has(product._id)
  }

  function quantityOf(product: IProduct): number {
    return entriesById.value.get(product._id)?.quantity ?? 0
  }

  function clearError(productId?: string) {
    orderError.value = ''
    if (productId) {
      insufficientProductIds.value.delete(productId)
    } else {
      insufficientProductIds.value = new Set()
    }
  }

  function addProduct(product: IProduct) {
    const existing = entriesById.value.get(product._id)
    if (existing) {
      existing.quantity += 1
    } else {
      entriesById.value.set(product._id, { product, quantity: 1 })
    }
    clearError(product._id)
  }

  function removeProduct(product: IProduct) {
    const existing = entriesById.value.get(product._id)
    if (!existing) return
    existing.quantity -= 1
    if (existing.quantity <= 0) {
      entriesById.value.delete(product._id)
    }
    clearError(product._id)
  }

  // Перезагружаем товары корзины (остаток мог измениться) и подсвечиваем нехватки.
  async function handleStockShortage(shortages: StockShortage[]) {
    const fresh = await Promise.all(
      Array.from(entriesById.value.keys()).map((id) => getProduct(id)),
    )
    for (const product of fresh) {
      const existing = entriesById.value.get(product._id)
      if (existing) existing.product = product
    }

    insufficientProductIds.value = new Set(shortages.map((s) => s.productId))
    orderError.value = 'Некоторых товаров не хватает на складе. Уменьшите количество и попробуйте снова.'
  }

  function validateOrderForm() {
    showValidationErrors.value = true
    return isOrderFormValid.value
  }

  function clear() {
    entriesById.value = new Map()
    address.value = ''
    name.value = ''
    phone.value = ''
    email.value = ''
    showValidationErrors.value = false
    orderError.value = ''
    insufficientProductIds.value = new Set()
  }

  return {
    items,
    addProduct,
    removeProduct,
    totalQuantity,
    totalPrice,
    address,
    name,
    phone,
    email,
    showValidationErrors,
    isAddressValid,
    isNameValid,
    isPhoneValid,
    isEmailValid,
    isOrderFormValid,
    validateOrderForm,
    orderError,
    insufficientProductIds,
    isInsufficient,
    quantityOf,
    clearError,
    handleStockShortage,
    clear,
  }
})
