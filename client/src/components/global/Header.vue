<script setup lang="ts">
import ShoppingBag from '@/assets/vector/ShoppingBag.vue'
import ArrowLeft from '@/assets/vector/ArrowLeft.vue'
import { useCartStore } from '@/stores/cart'
const props = withDefaults(defineProps<{ backButton?: boolean; BackLink: string }>(), {
  backButton: true,
})

const cartStore = useCartStore()
</script>

<template>
  <div class="grid grid-cols-[24px_1fr_24px] items-center p-4 pb-2">
    <div class="flex justify-start">
      <RouterLink v-if="props.backButton" :to="props.BackLink" class="">
        <ArrowLeft />
      </RouterLink>
    </div>

    <RouterLink to="/">
      <h2 class="text-center">Сказка Странствий</h2>
    </RouterLink>

    <div class="flex justify-end">
      <RouterLink to="/cart" class="cart-button">
        <ShoppingBag />
        <span v-if="cartStore.totalQuantity > 0" class="cart-button-count">{{
          cartStore.totalQuantity
        }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
h2 {
  font-family: 'Comforter';
  font-size: 2.5rem;
}

.cart-button {
  position: relative;
}

.cart-button-count {
  position: absolute;
  top: 10px;
  right: -10px;

  background-color: var(--vt-c-black);
  border-radius: 50%;
  color: var(--vt-c-white);
  font-size: 0.6rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 6px;
}
</style>
