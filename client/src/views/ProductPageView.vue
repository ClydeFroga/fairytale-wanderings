<script lang="ts" setup>
import Header from '@/components/global/Header.vue'
import type { IProduct } from '@/types/product'
import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProduct, getProducts } from '@/api/products'
import { ApiError } from '@/api/client'
import { imageUrl, imageUrls } from '@/scripts/images'
import { useCartStore } from '@/stores/cart'

const SHOP_NAME = 'Сказка странствий'

const product: Ref<IProduct> = ref({
  _id: '',
  slug: '',
  name: '',
  price: 0,
  image: [],
  description: '',
  category: '',
  categorySlug: '',
  categoryId: '',
  isActive: true,
  details: {},
  stock: 0,
  weight: null,
  length: null,
  width: null,
  height: null,
})

const props = defineProps<{ product?: IProduct }>()

const gallery = computed(() => imageUrls(product.value.image))
const route = useRoute()
const router = useRouter()
const cartStore = useCartStore()

const photo = ref(0)
const similar = ref<IProduct[]>([])
const drag = ref(0)
const dragging = ref(false)
let dragStartX = 0

const priceLabel = computed(() => `${product.value.price.toLocaleString('ru-RU')} ₽`)
const inCart = computed(() => cartStore.quantityOf(product.value) > 0)
const soldOut = computed(() => product.value.stock === 0 && !inCart.value)
const badge = computed(() => {
  if (product.value.stock === 0) return 'Нет в наличии'
  if (product.value.stock === 1) return 'Последняя'
  if (product.value.stock <= 3) return `Осталось ${product.value.stock}`
  return ''
})
const specs = computed(() =>
  Object.entries(product.value.details ?? {}).filter(([, value]) => String(value).trim()),
)
const categoryTo = computed(() =>
  product.value.categorySlug
    ? { path: '/', query: { category: product.value.categorySlug } }
    : { path: '/', hash: '#catalog' },
)
const buyLabel = computed(() => {
  if (soldOut.value) return 'Нет в наличии'
  if (inCart.value) return 'В корзине'
  return 'Добавить в корзину'
})
const barLabel = computed(() =>
  buyLabel.value === 'Добавить в корзину' ? 'В корзину' : buyLabel.value,
)

function shift(delta: number) {
  const total = gallery.value.length
  if (total < 2) return
  photo.value = (photo.value + delta + total) % total
}

function onPointerDown(event: PointerEvent) {
  if (gallery.value.length < 2) return
  if (event.target instanceof Element && event.target.closest('button')) return
  dragging.value = true
  dragStartX = event.clientX
  drag.value = 0
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // Синтетические и уже завершённые касания захват не принимают.
    }
  }
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  drag.value = event.clientX - dragStartX
}

function onPointerUp() {
  if (!dragging.value) return
  const distance = drag.value
  dragging.value = false
  drag.value = 0
  if (distance <= -48) shift(1)
  else if (distance >= 48) shift(-1)
}

function toggleCart() {
  if (soldOut.value) return
  if (inCart.value) {
    const qty = cartStore.quantityOf(product.value)
    for (let i = 0; i < qty; i += 1) cartStore.removeProduct(product.value)
    return
  }
  if (product.value.stock > 0) cartStore.addProduct(product.value)
}

async function load() {
  if (props.product) {
    product.value = props.product
    return
  }

  try {
    product.value = await getProduct(String(route.params.slug))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await router.replace({
        name: 'not-found',
        params: { pathMatch: route.path.slice(1).split('/') },
      })
      return
    }
    console.error(error)
  }
}

watch(
  () => [route.params.slug, props.product] as const,
  () => {
    void load()
  },
  { immediate: true },
)

watch(
  () => product.value.name,
  (name) => {
    if (name) document.title = `${name} — ${SHOP_NAME}`
  },
)

watch(
  () => product.value.slug,
  async (slug) => {
    photo.value = 0
    if (!slug) {
      similar.value = []
      return
    }
    try {
      const list = await getProducts(
        product.value.categorySlug ? { category: product.value.categorySlug } : {},
      )
      similar.value = list.filter((item) => item.slug !== slug).slice(0, 4)
    } catch {
      similar.value = []
    }
  },
)

onMounted(() => {
  document.body.classList.add('product-page')
})

onUnmounted(() => {
  document.body.classList.remove('product-page')
})
</script>

<template>
  <div class="product-page">
    <Header BackLink="/" />

    <div v-if="product.slug" class="container product">
      <nav class="breadcrumbs" aria-label="Хлебные крошки">
        <RouterLink to="/#catalog">Каталог</RouterLink>
        <span aria-hidden="true">/</span>
        <RouterLink v-if="product.category" :to="categoryTo">{{ product.category }}</RouterLink>
        <span v-if="product.category" class="crumb-tail" aria-hidden="true">/</span>
        <span class="crumb-current">{{ product.name }}</span>
      </nav>

      <div class="product-layout">
        <div class="gallery">
          <div
            class="gallery-main"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <span v-if="badge" class="badge badge-lg">{{ badge }}</span>
            <span v-if="gallery.length > 1" class="gallery-counter">
              {{ photo + 1 }} / {{ gallery.length }}
            </span>
            <button
              v-if="gallery.length > 1"
              type="button"
              class="gallery-arrow prev"
              aria-label="Предыдущее фото"
              @click="shift(-1)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              v-if="gallery.length > 1"
              type="button"
              class="gallery-arrow next"
              aria-label="Следующее фото"
              @click="shift(1)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div
              v-if="gallery.length"
              class="gallery-track"
              :class="{ dragging }"
              :style="{ transform: `translateX(calc(${-photo * 100}% + ${drag}px))` }"
            >
              <img
                v-for="(src, index) in gallery"
                :key="index"
                class="gallery-photo"
                :src="src"
                :alt="index === 0 ? product.name : ''"
                draggable="false"
              />
            </div>
            <div v-else class="gallery-placeholder">Фото ещё не загружено</div>
          </div>

          <div
            v-if="gallery.length > 1"
            class="thumbs"
            role="group"
            aria-label="Фотографии изделия"
          >
            <button
              v-for="(src, index) in gallery"
              :key="index"
              type="button"
              class="thumb"
              :aria-pressed="index === photo"
              :aria-label="`Фото ${index + 1}`"
              @click="photo = index"
            >
              <img :src="src" alt="" />
            </button>
          </div>

          <div v-if="gallery.length > 1" class="dots gallery-dots">
            <button
              v-for="(_, index) in gallery"
              :key="index"
              type="button"
              class="dot"
              :aria-current="index === photo ? 'true' : undefined"
              :aria-label="`Фото ${index + 1}`"
              @click="photo = index"
            >
              <span></span>
            </button>
          </div>
        </div>

        <div class="product-info">
          <div class="product-head">
            <div v-if="product.category" class="card-cat">{{ product.category }}</div>
            <h1 class="product-title">{{ product.name }}</h1>
            <div class="product-price">{{ priceLabel }}</div>
          </div>

          <div class="buy-block">
            <button
              type="button"
              class="btn-add btn-lg"
              :class="{ 'in-cart': inCart }"
              :disabled="soldOut"
              @click="toggleCart"
            >
              {{ buyLabel }}
            </button>
            <div class="ship-note">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A2412E"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 7h11v9H3z" />
                <path d="M14 10h4l3 3v3h-7" />
                <circle cx="7" cy="17.5" r="1.5" />
                <circle cx="17" cy="17.5" r="1.5" />
              </svg>
              Отправка через 2–3 дня · бережная упаковка
            </div>
          </div>

          <p v-if="product.description" class="product-desc">{{ product.description }}</p>

          <dl v-if="specs.length" class="specs">
            <template v-for="[key, value] in specs" :key="key">
              <dt>{{ key }}</dt>
              <dd>{{ value }}</dd>
            </template>
          </dl>

          <div class="accordion">
            <details>
              <summary>Доставка и упаковка</summary>
              <p>
                Доставка по России через СДЭК. Каждое изделие бережно упаковано, чтобы доехало
                целым.
              </p>
            </details>
          </div>
        </div>
      </div>

      <section v-if="similar.length" class="similar">
        <div class="similar-head">
          <h2>Вам может понравиться</h2>
          <RouterLink to="/#catalog" class="text-link small">Весь каталог →</RouterLink>
        </div>
        <div class="similar-list">
          <RouterLink
            v-for="item in similar"
            :key="item._id"
            class="similar-item"
            :to="`/product/${item.slug}`"
          >
            <img
              v-if="imageUrl(item.image?.[0])"
              :src="imageUrl(item.image?.[0])"
              :alt="item.name"
            />
            <div class="similar-name">{{ item.name }}</div>
            <div class="similar-price">{{ item.price.toLocaleString('ru-RU') }} ₽</div>
          </RouterLink>
        </div>
      </section>
    </div>

    <div v-if="product.slug" class="mobile-buybar">
      <div class="product-price small">{{ priceLabel }}</div>
      <button
        type="button"
        class="btn-add btn-lg"
        :class="{ 'in-cart': inCart }"
        :disabled="soldOut"
        @click="toggleCart"
      >
        {{ barLabel }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.product-page {
  background: var(--bg);
  color: var(--ink);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.product {
  padding-top: 24px;
  padding-bottom: 80px;
}

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 28px;
}

.breadcrumbs a {
  color: var(--muted);
  text-decoration: none;
}

.breadcrumbs a:hover {
  color: var(--accent);
}

.crumb-current {
  color: var(--ink);
}

.product-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 56px;
}

.gallery {
  flex: 1 1 480px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gallery-main {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 20px;
  overflow: hidden;
  background: #efe7dc;
  touch-action: pan-y;
}

.gallery-track {
  display: flex;
  height: 100%;
  width: 100%;
  transition: transform 0.35s ease;
}

.gallery-track.dragging {
  transition: none;
}

.gallery-photo {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  pointer-events: none;
}

.gallery-placeholder {
  position: absolute;
  inset: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  color: #7a6a5d;
  font-size: 16px;
  border: 2px dashed var(--line-strong);
  border-radius: 16px;
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

.badge-lg {
  top: 16px;
  left: 16px;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 14px;
  z-index: 1;
}

.gallery-counter {
  display: none;
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 5px 10px;
  border-radius: 12px;
  background: rgba(43, 36, 32, 0.72);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  z-index: 1;
}

.gallery-arrow {
  display: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 22px;
  background: rgba(255, 253, 249, 0.88);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  z-index: 1;
}

.gallery-arrow.prev {
  left: 8px;
}

.gallery-arrow.next {
  right: 8px;
}

.gallery-dots {
  display: none;
  justify-content: center;
}

.dots {
  gap: 2px;
}

.dot {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot span {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: var(--line-strong);
  transition:
    width 0.3s ease,
    background 0.3s ease;
}

.dot[aria-current='true'] span {
  width: 20px;
  background: var(--accent);
}

.thumbs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.thumb {
  aspect-ratio: 1 / 1;
  padding: 0;
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
  background: #efe7dc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  border: 2px solid transparent;
}

.thumb[aria-pressed='true'] {
  border-color: var(--accent);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1 1 400px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.product-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-cat {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a6a5d;
}

.product-title {
  margin: 0;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 44px;
  line-height: 1.1;
}

.product-price {
  font-size: 30px;
  font-weight: 700;
  margin-top: 4px;
}

.product-price.small {
  font-size: 20px;
  margin: 0;
  white-space: nowrap;
}

.buy-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.btn-lg {
  height: 52px;
  border-radius: 26px;
  font-size: 16px;
  max-width: 420px;
}

.ship-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--muted);
}

.ship-note svg {
  flex: none;
}

.product-desc {
  margin: 0;
  font-size: 17px;
  line-height: 1.65;
  color: #4a3e36;
}

.specs {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(110px, auto) minmax(0, 1fr);
  border-top: 1px solid #e8dfd3;
}

.specs dt {
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid #e8dfd3;
  font-size: 15px;
  color: var(--muted);
}

.specs dd {
  margin: 0;
  padding: 12px 0;
  border-bottom: 1px solid #e8dfd3;
  font-size: 15px;
}

.accordion details {
  border-bottom: 1px solid #e8dfd3;
}

.accordion summary {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  list-style: none;
}

.accordion summary::-webkit-details-marker {
  display: none;
}

.accordion summary::after {
  content: '+';
  font-size: 22px;
  font-weight: 400;
  color: var(--accent);
}

.accordion details[open] summary::after {
  content: '−';
}

.accordion summary:hover {
  color: var(--accent);
}

.accordion p {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--muted-2);
}

.similar {
  margin-top: 88px;
}

.similar-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 24px;
}

.similar-head h2 {
  margin: 0;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 32px;
}

.text-link {
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.text-link.small {
  font-size: 15px;
  white-space: nowrap;
}

.text-link:hover {
  color: var(--accent-dark);
}

.similar-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
}

.similar-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
  transition: transform 0.2s ease;
}

.similar-item:hover {
  transform: translateY(-3px);
}

.similar-item img {
  width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 14px;
  background: #efe7dc;
}

.similar-name {
  font-family: var(--serif);
  font-size: 18px;
}

.similar-price {
  font-size: 16px;
  font-weight: 700;
}

.mobile-buybar {
  display: none;
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .product {
    display: flex;
    flex-direction: column;
    padding: 0 0 40px;
  }

  .product-layout {
    display: contents;
  }

  .gallery {
    order: 1;
    flex: none;
    gap: 8px;
  }

  .breadcrumbs {
    order: 2;
  }

  .product-info {
    order: 3;
    flex: none;
  }

  .similar {
    order: 4;
  }

  .gallery-main {
    border-radius: 0;
  }

  .gallery-arrow {
    display: flex;
  }

  .gallery-counter {
    display: block;
  }

  .gallery-dots {
    display: flex;
  }

  .thumbs {
    display: none;
  }

  .badge-lg {
    top: 12px;
    left: 12px;
    font-size: 12px;
    padding: 5px 10px;
  }

  .breadcrumbs {
    padding: 16px 16px 0;
    margin-bottom: 0;
    font-size: 13px;
  }

  .crumb-tail,
  .crumb-current,
  .card-cat {
    display: none;
  }

  .product-info {
    padding: 12px 16px 0;
    gap: 20px;
  }

  .product-title {
    font-size: 30px;
    line-height: 1.15;
  }

  .product-price {
    font-size: 26px;
  }

  .buy-block .btn-add {
    display: none;
  }

  .product-desc {
    font-size: 16px;
  }

  .specs {
    grid-template-columns: 110px minmax(0, 1fr);
  }

  .similar {
    margin-top: 40px;
  }

  .similar-head {
    padding: 0 16px;
    margin-bottom: 14px;
  }

  .similar-head h2 {
    font-size: 24px;
  }

  .similar-head .text-link {
    display: none;
  }

  .similar-list {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    gap: 12px;
    padding: 0 16px 4px;
  }

  .similar-list::-webkit-scrollbar {
    display: none;
  }

  .similar-item {
    flex: 0 0 150px;
  }

  .similar-item:hover {
    transform: none;
  }

  .similar-name {
    font-size: 15px;
  }

  .mobile-buybar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    align-items: center;
    gap: 16px;
    padding: 12px 16px 16px;
    background: var(--surface);
    border-top: 1px solid #e8dfd3;
    box-shadow: 0 -8px 20px -14px rgba(60, 40, 25, 0.4);
  }

  .mobile-buybar .btn-add {
    flex: 1;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-track {
    transition: none;
  }
}
</style>

<style>
@media (max-width: 720px) {
  body.product-page .footer-bottom {
    padding-bottom: 100px;
  }
}
</style>
