<script setup lang="ts">
import Button from '@/components/global/Button.vue'
import type { IProduct } from '@/components/product/IProduct'
import { computed, type PropType } from 'vue'
import { useCartStore } from '@/stores/cart'
import { Order } from '@/scripts/Order'

defineProps({
  text: {
    type: String,
    required: true,
  },
})

const cartStore = useCartStore()

const disabled = computed(() => cartStore.totalQuantity === 0)

const makeOrder = () => {
  const order = new Order(cartStore.products, cartStore.address, cartStore.name, cartStore.phone)
  order.send()
}
</script>

<template>
  <Button @click="makeOrder" :text="text" :disabled="disabled" />
</template>
