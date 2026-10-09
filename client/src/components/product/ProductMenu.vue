<script setup lang="ts">
import type { IProduct } from '@/types/product'
import { computed } from 'vue'
import { imageUrl } from '@/scripts/images'
import { useCartStore } from '@/stores/cart'

const props = defineProps<{ product: IProduct }>()

const cartStore = useCartStore()

const cover = computed(() => imageUrl(props.product.image?.[0]))
const priceLabel = computed(() => `${props.product.price.toLocaleString('ru-RU')} ₽`)
const inCart = computed(() => cartStore.quantityOf(props.product) > 0)
const soldOut = computed(() => props.product.stock === 0 && !inCart.value)
const badge = computed(() => {
  if (props.product.stock === 0) return 'Нет в наличии'
  if (props.product.stock === 1) return 'Последняя'
  if (props.product.stock <= 3) return `Осталось ${props.product.stock}`
  return ''
})
const note = computed(() => props.product.description.trim())

function toggleCart() {
  if (inCart.value) {
    const qty = cartStore.quantityOf(props.product)
    for (let i = 0; i < qty; i += 1) cartStore.removeProduct(props.product)
    return
  }
  if (props.product.stock > 0) cartStore.addProduct(props.product)
}
</script>

<template>
  <article class="card">
    <RouterLink :to="`/product/${props.product.slug}`" class="card-link">
      <div class="card-media">
        <img
          v-if="cover"
          :src="cover"
          :alt="props.product.name"
          :class="{ grayscale: props.product.stock === 0 }"
          loading="lazy"
        />
        <span v-if="badge" class="badge">{{ badge }}</span>
      </div>
      <div class="card-copy">
        <div v-if="props.product.category" class="card-cat">{{ props.product.category }}</div>
        <h3>{{ props.product.name }}</h3>
        <div v-if="note" class="card-note">{{ note }}</div>
      </div>
    </RouterLink>
    <div class="card-foot">
      <div class="price">{{ priceLabel }}</div>
      <button
        type="button"
        class="btn-add"
        :class="{ 'in-cart': inCart }"
        :disabled="soldOut"
        @click="toggleCart"
      >
        {{ soldOut ? 'Нет в наличии' : inCart ? 'В корзине' : 'В корзину' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -18px rgba(60, 40, 25, 0.45);
}

.card-link {
  color: inherit;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-media {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #efe7dc;
}

.card-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.card:hover .card-media img {
  transform: scale(1.04);
}

.grayscale {
  filter: grayscale(100%);
}

.badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 10px;
  border-radius: 12px;
  background: rgba(255, 253, 249, 0.94);
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.card-copy {
  padding: 16px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-cat {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a6a5d;
}

h3 {
  margin: 0;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 20px;
  line-height: 1.25;
  color: var(--ink);
}

.card-note {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-foot {
  margin-top: auto;
  padding: 14px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price {
  font-size: 20px;
  font-weight: 700;
}

.btn-add {
  height: 44px;
  width: 100%;
  border-radius: 22px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent);
  color: #fff;
  border: 0;
}

.btn-add:hover:not(:disabled) {
  background: var(--accent-dark);
}

.btn-add.in-cart {
  background: var(--sand);
  color: var(--ink);
  border: 1px solid var(--line-strong);
}

.btn-add.in-cart:hover:not(:disabled) {
  background: #e5d9cb;
  color: var(--ink);
}

.btn-add:disabled {
  cursor: not-allowed;
  background: var(--sand);
  color: var(--muted);
  border: 1px solid var(--line);
}

@media (max-width: 720px) {
  .card {
    border-radius: 14px;
  }

  .card:hover {
    transform: none;
    box-shadow: none;
  }

  .card:hover .card-media img {
    transform: none;
  }

  .card-copy {
    padding: 10px 10px 0;
    gap: 4px;
  }

  .card-cat {
    font-size: 11px;
  }

  h3 {
    font-size: 16px;
  }

  .card-note {
    display: none;
  }

  .card-foot {
    padding: 8px 10px 12px;
    gap: 8px;
  }

  .price {
    font-size: 16px;
  }

  .btn-add {
    font-size: 14px;
  }

  .badge {
    top: 8px;
    left: 8px;
    padding: 4px 8px;
    font-size: 11px;
  }
}
</style>
