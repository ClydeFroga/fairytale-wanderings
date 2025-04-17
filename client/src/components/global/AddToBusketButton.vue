<script setup lang="ts">
import Button from '@/components/global/Button.vue'
import type { IProduct } from '@/components/product/IProduct'
import type { PropType } from 'vue'
import { useCartStore } from '@/stores/cart'
defineProps({
  text: {
    type: String,
    required: true,
  },
  product: {
    type: Object as PropType<IProduct>,
    required: true,
  },
})

const cartStore = useCartStore()
</script>

<template>
  <Button @click="cartStore.addProduct(product)" :text="text" />
</template>
