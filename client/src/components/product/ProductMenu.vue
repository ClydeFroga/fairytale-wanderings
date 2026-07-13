<script setup lang="ts">
import type { IProduct } from './IProduct'
import type { PropType } from 'vue'
const props = defineProps({
  product: {
    type: Object as PropType<IProduct>,
    required: true,
  },
})
</script>

<template>
  <RouterLink
    :to="`/product/${props.product._id}`"
    class="flex w-full min-w-0 flex-col gap-3 pb-3"
    :product="props.product"
  >
    <div
      class="w-full bg-center bg-no-repeat aspect-3/4 bg-cover rounded-xl hover:scale-105 transition-all duration-300"
      :style="{
        backgroundImage: `url(${props.product.image[0]})`,
        filter: props.product.stock === 0 ? 'grayscale(100%)' : 'none',
      }"
    ></div>
    <p class="text-base font-medium leading-normal">
      {{ props.product.name }}
    </p>
  </RouterLink>
</template>

<style scoped></style>
