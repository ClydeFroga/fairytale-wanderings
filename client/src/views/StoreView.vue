<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import Categories from '@/components/global/Categories.vue'
import ProductMenu from '@/components/product/ProductMenu.vue'
import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import type { IProduct } from '@/types/product'
import { getProducts } from '@/api/products'
import { getCategories, type ICategory } from '@/api/categories'
import { imageUrl } from '@/scripts/images'

const route = useRoute()

const products: Ref<IProduct[]> = ref([])
const categoriesList: Ref<ICategory[]> = ref([])
const loaded = ref(false)
const slide = ref(0)

const activeCategory = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : undefined,
)

const searchText = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))

const searched = computed(() => {
  const query = searchText.value.trim().toLowerCase()
  if (!query) return products.value
  return products.value.filter((product) => product.name.toLowerCase().includes(query))
})

const visibleProducts = computed(() => {
  const category = activeCategory.value
  if (!category) return searched.value
  return searched.value.filter((product) => product.categorySlug === category)
})

const categoryTabs = computed(() =>
  [
    { param: '', text: 'Все', count: searched.value.length },
    ...categoriesList.value.map((category) => ({
      param: category.slug,
      text: category.name,
      count: searched.value.filter((product) => product.categorySlug === category.slug).length,
    })),
  ].filter((tab) => tab.count > 0),
)

const slides = computed(() => products.value.filter((product) => imageUrl(product.image?.[0])))

const countLabel = computed(
  () => `В наличии ${visibleProducts.value.length} ${plural(visibleProducts.value.length)}`,
)

// В Chrome сетку перекрашивает браузер. Здесь ключ нужен только запасному затуханию.
const catalogMotion =
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const catalogKey = computed(() =>
  catalogMotion ? 'stable' : `${activeCategory.value ?? ''}|${searchText.value}`,
)

function plural(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'изделие'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'изделия'
  return 'изделий'
}

function goTo(index: number, manual: boolean) {
  const total = slides.value.length
  if (!total) return
  slide.value = (index + total) % total
  if (manual) stopAutoplay()
}

let timer: ReturnType<typeof setInterval> | undefined

function stopAutoplay() {
  if (timer) clearInterval(timer)
  timer = undefined
}

function startAutoplay() {
  stopAutoplay()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (slides.value.length < 2) return
  timer = setInterval(() => goTo(slide.value + 1, false), 5000)
}

watch(slides, (list) => {
  if (slide.value >= list.length) slide.value = 0
  startAutoplay()
})

onMounted(async () => {
  document.title = 'Сказка странствий — керамика ручной работы'
  try {
    const [categories, list] = await Promise.all([getCategories(), getProducts()])
    categoriesList.value = categories
    products.value = list
  } catch (error) {
    console.error(error)
  } finally {
    loaded.value = true
    startAutoplay()
  }
})

onUnmounted(stopAutoplay)
</script>

<template>
  <div class="store">
    <Header :back-button="false" BackLink="/" />

    <section id="top" class="container hero">
      <div class="hero-text">
        <div class="eyebrow">Керамика ручной работы</div>
        <h1>Маленькие истории, вылепленные из глины</h1>
        <p class="lead">
          Броши, кружки и фигурки, которые я леплю, расписываю и обжигаю сама. Каждая вещь
          существует в единственном варианте — двух одинаковых не бывает.
        </p>
        <RouterLink to="/about" class="text-link">Подробнее обо мне →</RouterLink>
      </div>

      <div
        v-if="slides.length"
        class="carousel"
        aria-roledescription="карусель"
        aria-label="Изделия мастерской"
      >
        <div class="carousel-viewport">
          <div class="carousel-track" :style="{ transform: `translateX(-${slide * 100}%)` }">
            <img
              v-for="item in slides"
              :key="item._id"
              :src="imageUrl(item.image[0])"
              :alt="item.name"
            />
          </div>
        </div>
        <div class="carousel-controls">
          <button
            type="button"
            class="icon-btn outlined"
            aria-label="Предыдущее изделие"
            @click="goTo(slide - 1, true)"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div class="carousel-meta">
            <div class="dots">
              <button
                v-for="(item, index) in slides"
                :key="item._id"
                type="button"
                class="dot"
                :aria-current="index === slide"
                :aria-label="`Показать: ${item.name}`"
                @click="goTo(index, true)"
              >
                <span></span>
              </button>
            </div>
          </div>
          <button
            type="button"
            class="icon-btn outlined"
            aria-label="Следующее изделие"
            @click="goTo(slide + 1, true)"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <section id="catalog" class="container catalog">
      <div class="catalog-head">
        <div>
          <h2>Каталог</h2>
          <p v-if="loaded" class="muted">{{ countLabel }}</p>
        </div>
        <Categories :categories="categoryTabs" />
      </div>

      <div class="catalog-motion">
        <Transition :css="!catalogMotion" name="catalog">
          <div :key="catalogKey" class="catalog-stage">
            <div v-if="visibleProducts.length" class="grid">
              <ProductMenu
                v-for="product in visibleProducts"
                :key="product._id"
                :product="product"
              />
            </div>
            <p v-else-if="loaded" class="muted empty">Ничего не нашлось</p>

            <div id="delivery" class="delivery-strip">
              <div class="delivery-text">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A2412E"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 7h11v9H3z" />
                  <path d="M14 10h4l3 3v3h-7" />
                  <circle cx="7" cy="17.5" r="1.5" />
                  <circle cx="17" cy="17.5" r="1.5" />
                </svg>
                <div>
                  Доставка по России · каждое изделие бережно упаковано, чтобы доехало целым
                </div>
              </div>
              <RouterLink to="/terms" class="text-link small">Доставка и оплата →</RouterLink>
            </div>
          </div>
        </Transition>
      </div>
    </section>
  </div>
</template>

<style scoped>
.store {
  background: var(--bg);
  color: var(--ink);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.hero {
  padding-top: 72px;
  padding-bottom: 64px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 56px;
}

.hero-text {
  flex: 1 1 420px;
  min-width: 0;
}

.eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 18px;
}

h1 {
  margin: 0 0 20px;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 56px;
  line-height: 1.08;
  letter-spacing: -0.01em;
}

.lead {
  margin: 0 0 20px;
  font-size: 18px;
  line-height: 1.6;
  color: var(--muted-2);
  max-width: 480px;
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

.carousel {
  flex: 1 1 420px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 20px;
}

.carousel-viewport {
  width: 100%;
  max-width: 360px;
  aspect-ratio: 233 / 313;
  overflow: hidden;
  border-radius: 20px;
  background: #efe7dc;
}

.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s ease;
}

.carousel-track img {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-controls {
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.carousel-meta {
  display: flex;
  align-items: center;
  min-width: 0;
}

.dots {
  display: flex;
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

.icon-btn {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 22px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  flex: none;
}

.icon-btn.outlined {
  border: 1px solid var(--line-strong);
}

.icon-btn:hover {
  background: var(--sand);
}

.catalog {
  padding-top: 40px;
  padding-bottom: 88px;
}

.catalog-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 28px;
}

h2 {
  margin: 0 0 6px;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 38px;
}

.muted {
  margin: 0;
  font-size: 15px;
  color: var(--muted);
}

.empty {
  padding: 24px 0 8px;
}

.catalog-motion {
  position: relative;
}

.catalog-enter-active,
.catalog-leave-active {
  transition: opacity 0.28s ease;
}

.catalog-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.catalog-enter-from,
.catalog-leave-to {
  opacity: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(216px, 1fr));
  gap: 24px;
}

.delivery-strip {
  margin-top: 48px;
  padding: 20px 24px;
  border-radius: 16px;
  background: var(--sand);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px 24px;
}

.delivery-text {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  font-size: 16px;
  line-height: 1.5;
}

.delivery-text svg {
  flex: none;
}

@media (max-width: 960px) {
  .carousel {
    display: none;
  }
}

@media (max-width: 720px) {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero {
    padding-top: 32px;
    padding-bottom: 8px;
    gap: 0;
  }

  .eyebrow {
    font-size: 12px;
    margin-bottom: 12px;
  }

  h1 {
    font-size: 34px;
    line-height: 1.12;
    margin-bottom: 14px;
  }

  .lead {
    font-size: 16px;
    margin-bottom: 14px;
  }

  .catalog {
    padding-top: 32px;
    padding-bottom: 56px;
  }

  .catalog-head {
    display: block;
    margin-bottom: 0;
  }

  h2 {
    font-size: 30px;
  }

  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .delivery-strip {
    margin-top: 32px;
    padding: 16px;
    border-radius: 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .delivery-text {
    align-items: flex-start;
    gap: 12px;
    font-size: 15px;
  }

  .delivery-strip .text-link {
    padding-left: 40px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-track,
  .catalog-enter-active,
  .catalog-leave-active {
    transition: none;
  }
}
</style>
