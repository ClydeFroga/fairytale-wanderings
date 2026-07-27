<script setup lang="ts">
import type { IProduct } from '@/types/product'
import { computed } from 'vue'
import { imageUrl } from '@/scripts/images'

const props = defineProps<{ product: IProduct }>()

const cover = computed(() => imageUrl(props.product.image?.[0]))
const priceLabel = computed(() => `${props.product.price.toLocaleString('ru-RU')} ₽`)
const stockLabel = computed(() =>
  props.product.stock === 0 ? 'нет в наличии' : `осталось ${props.product.stock} шт.`,
)
</script>

<template>
  <RouterLink
    :to="`/product/${props.product._id}`"
    class="card group flex w-full min-w-0 flex-col overflow-hidden"
  >
    <!-- Image -->
    <div class="relative aspect-3/4 w-full overflow-hidden">
      <div
        class="h-full w-full bg-center bg-no-repeat bg-cover transition-transform duration-300 group-hover:scale-105"
        :style="{
          backgroundImage: `url(${cover})`,
          filter: props.product.stock === 0 ? 'grayscale(100%)' : 'none',
        }"
      ></div>
    </div>

    <!-- Body -->
    <div class="flex flex-col px-4 pt-4 pb-4 grow-1">
      <span class="category mb-2">{{ props.product.category }}</span>
      <h3 class="name mb-3 line-clamp-2">{{ props.product.name }}</h3>
      <div class="mt-auto flex items-baseline justify-between gap-3">
        <span class="price">{{ priceLabel }}</span>
        <span class="stock">{{ stockLabel }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  background: #faf6ee;
  border: 1px solid rgba(122, 92, 58, 0.16);
  border-radius: 16px;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.7) inset,
    0 18px 40px -18px rgba(74, 52, 30, 0.4);
}

.category {
  font-family: ui-monospace, Menlo, monospace;
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #a08a6a;
}

.name {
  font-weight: 500;
  font-size: 18px;
  line-height: 1.2;
  color: var(--brand-ink);
}

.price {
  font-family: 'Noto Serif', serif;
  font-weight: 500;
  font-size: 18px;
  color: var(--brand-ink);
}
</style>
