<script setup lang="ts">
import type { IProduct } from '@/components/product/IProduct'
import { computed, type PropType } from 'vue'
import { useCartStore } from '@/stores/cart'

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  product: {
    type: Object as PropType<IProduct>,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

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
    class="add-btn max-w-[480px] flex-1"
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
.add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 84px;
  height: 48px;
  padding: 0 20px;
  appearance: none;
  border: 1px solid rgba(120, 42, 20, 0.35);
  border-radius: 11px;
  background: linear-gradient(180deg, #b8543a 0%, #a8492b 100%);
  color: #fdf3ec;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 6px 16px -8px rgba(140, 58, 30, 0.5);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #a8492b;
  box-shadow: 0 10px 22px -8px rgba(140, 58, 30, 0.55);
}

.add-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.add-btn:focus-visible {
  outline: 2px solid rgba(168, 73, 43, 0.4);
  outline-offset: 3px;
}

.add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

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
  color: #8f3c22;
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
  color: #33271a;
}
</style>
