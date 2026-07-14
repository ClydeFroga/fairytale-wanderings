import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { IProduct } from '@/components/product/IProduct'
import type { StockShortage } from '@/api/orders'
import { getProduct } from '@/api/products'

export const useCartStore = defineStore('cart', () => {
  const products = ref<Map<IProduct, number>>(new Map())
  const address = ref('')
  const name = ref('')
  const phone = ref('')
  const showValidationErrors = ref(false)
  const orderError = ref('')
  const insufficientProductIds = ref<Set<string>>(new Set())

  const isAddressValid = computed(() => address.value.trim().length > 0)
  const isNameValid = computed(() => name.value.trim().length > 0)
  const isPhoneValid = computed(() => /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(phone.value))
  const isOrderFormValid = computed(
    () => isAddressValid.value && isNameValid.value && isPhoneValid.value,
  )

  const totalQuantity = computed(() => {
    return Array.from(products.value.values()).reduce((acc, quantity) => {
      return acc + quantity
    }, 0)
  })

  const totalPrice = computed(() => {
    return Array.from(products.value.entries()).reduce((acc, [product, quantity]) => {
      return acc + product.price * quantity
    }, 0)
  })

  function isInsufficient(product: IProduct) {
    return insufficientProductIds.value.has(product._id)
  }

  // Сколько данного товара в корзине. Ищем по _id: в разных местах приходят
  // разные экземпляры объекта товара, а Map ключуется по ссылке.
  function quantityOf(product: IProduct): number {
    for (const [p, qty] of products.value.entries()) {
      if (p._id === product._id) return qty
    }
    return 0
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
    products.value.set(product, (products.value.get(product) || 0) + 1)
    clearError(product._id)
  }

  function removeProduct(product: IProduct) {
    products.value.set(product, (products.value.get(product) || 0) - 1)
    if (products.value.get(product) === 0) {
      products.value.delete(product)
    }
    clearError(product._id)
  }

  // Перезагружаем товары корзины (остаток мог измениться) и подсвечиваем нехватки.
  async function handleStockShortage(shortages: StockShortage[]) {
    const quantitiesById = new Map(
      Array.from(products.value.entries()).map(([product, quantity]) => [product._id, quantity]),
    )

    const fresh = await Promise.all(
      Array.from(quantitiesById.keys()).map((id) => getProduct(id)),
    )

    const next = new Map<IProduct, number>()
    for (const product of fresh) {
      const quantity = quantitiesById.get(product._id)
      if (quantity !== undefined) next.set(product, quantity)
    }
    products.value = next

    insufficientProductIds.value = new Set(shortages.map((s) => s.productId))
    orderError.value = 'Некоторых товаров не хватает на складе. Уменьшите количество и попробуйте снова.'
  }

  function validateOrderForm() {
    showValidationErrors.value = true
    return isOrderFormValid.value
  }

  function clear() {
    products.value = new Map()
    address.value = ''
    name.value = ''
    phone.value = ''
    showValidationErrors.value = false
    orderError.value = ''
    insufficientProductIds.value = new Set()
  }

  return {
    products,
    addProduct,
    removeProduct,
    totalQuantity,
    totalPrice,
    address,
    name,
    phone,
    showValidationErrors,
    isAddressValid,
    isNameValid,
    isPhoneValid,
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
