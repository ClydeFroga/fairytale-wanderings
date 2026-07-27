<script setup lang="ts">
import type { IProduct } from '@/types/product'
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'

const props = withDefaults(
  defineProps<{ text: string; product: IProduct; disabled?: boolean }>(),
  { disabled: false },
)

const cartStore = useCartStore()

const quantity = computed(() => cartStore.quantityOf(props.product))
// Не даём добавить больше, чем есть на складе (окончательная проверка — на сервере).
const canAddMore = computed(() => quantity.value < props.product.stock)
const atMax = computed(() => !canAddMore.value)
const qtyLabel = computed(() =>
  atMax.value ? `${quantity.value} шт. · максимум` : `${quantity.value} шт. в корзине`,
)
</script>

<template>
  <button
    v-if="quantity === 0"
    type="button"
    class="btn-primary max-w-[480px] flex-1"
    :disabled="disabled"
    @click="cartStore.addProduct(product)"
  >
    <span class="truncate">{{ text }}</span>
  </button>

  <div v-else class="stepper max-w-[480px] flex-1">
    <button
      type="button"
      class="step"
      aria-label="Убрать один"
      @click="cartStore.removeProduct(product)"
    >
      −
    </button>
    <span class="qty-label tabular-nums">{{ qtyLabel }}</span>
    <button
      type="button"
      class="step"
      :disabled="!canAddMore"
      aria-label="Добавить один"
      @click="cartStore.addProduct(product)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 48px;
  padding: 4px;
  background: #f3e7d6;
  border: 1px solid rgba(120, 42, 20, 0.28);
  border-radius: 11px;
}

.step {
  flex: none;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  border: 1px solid rgba(120, 42, 20, 0.28);
  border-radius: 8px;
  background: #faf3e8;
  color: var(--brand-accent-strong);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.14s ease,
    transform 0.1s ease;
}

.step:hover:not(:disabled) {
  background: #e7d6bf;
}

.step:active:not(:disabled) {
  transform: scale(0.94);
}

.step:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.qty-label {
  flex: 1;
  text-align: center;
  font-family: 'Noto Serif', serif;
  font-weight: 600;
  font-size: 16px;
  color: var(--brand-ink);
}
</style>
