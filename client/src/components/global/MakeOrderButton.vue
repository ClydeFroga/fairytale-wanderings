<script setup lang="ts">
import Button from '@/components/global/Button.vue'
import type { IProduct } from '@/components/product/IProduct'
import { computed, type PropType } from 'vue'
import { useCartStore } from '@/stores/cart'

defineProps({
  text: {
    type: String,
    required: true,
  },
  products: {
    type: Map as PropType<Map<IProduct, number>>,
    required: true,
  },
})

const cartStore = useCartStore()

const disabled = computed(() => cartStore.totalQuantity === 0)

const makeOrder = () => {
  console.log('make order')
}
</script>

<template>
  <Button @click="makeOrder" :text="text" :disabled="disabled" />
</template>
