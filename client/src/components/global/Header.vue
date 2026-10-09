<script setup lang="ts">
import ShoppingBag from '@/assets/vector/ShoppingBag.vue'
import ArrowLeft from '@/assets/vector/ArrowLeft.vue'
import VineLeft from '@/assets/vector/VineLeft.vue'
import VineRight from '@/assets/vector/VineRight.vue'
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

    <RouterLink class="brand" to="/">
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
.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  width: 100%;
  container-type: inline-size;
}

.vine {
  flex: 1 1 0;
  min-width: 0;
  width: 100%;
  max-width: 300px;
  height: auto;
}

.vine-left {
  aspect-ratio: 1097 / 278;
}

.vine-right {
  aspect-ratio: 1136 / 292;
}

h2 {
  flex: 0 0 auto;
  font-family: 'Skazka Stranstvij';
  font-size: clamp(1.2rem, 7cqw, 4em);
  line-height: 1;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .vine {
    display: none;
  }

  h2 {
    font-size: clamp(1.75rem, 10vw, 4em);
  }
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
  font-size: 1rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 6px;
}
</style>
