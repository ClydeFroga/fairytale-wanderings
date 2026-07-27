<script setup lang="ts">
import Button from '@/components/global/Button.vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { Order } from '@/scripts/Order'
import { ApiError } from '@/api/client'
import type { StockShortage } from '@/api/orders'

defineProps<{ text: string }>()

const cartStore = useCartStore()
const router = useRouter()

const disabled = computed(() => cartStore.totalQuantity === 0)

const makeOrder = async () => {
  if (!cartStore.validateOrderForm()) {
    return
  }

  const order = new Order(cartStore.items, cartStore.address, cartStore.name, cartStore.phone)

  try {
    await order.send()
    cartStore.clear()
    router.push('/order/success')
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INSUFFICIENT_STOCK') {
      const shortages = (error.details as { shortages?: StockShortage[] } | undefined)?.shortages
      await cartStore.handleStockShortage(shortages ?? [])
      return
    }

    console.error(error)
    cartStore.orderError = 'Не удалось оформить заказ. Попробуйте позже.'
  }
}
</script>

<template>
  <Button @click="makeOrder" :text="text" :disabled="disabled" />
</template>
