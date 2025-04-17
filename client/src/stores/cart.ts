import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { IProduct } from '@/components/product/IProduct'

export const useCartStore = defineStore('cart', () => {
  const products = ref<Map<IProduct, number>>(new Map())

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

  function addProduct(product: IProduct) {
    products.value.set(product, (products.value.get(product) || 0) + 1)
  }

  function removeProduct(product: IProduct) {
    products.value.set(product, (products.value.get(product) || 0) - 1)
    if (products.value.get(product) === 0) {
      products.value.delete(product)
    }
  }

  return { products, addProduct, removeProduct, totalQuantity, totalPrice }
})
