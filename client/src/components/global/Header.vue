<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const props = withDefaults(defineProps<{ backButton?: boolean; BackLink: string }>(), {
  backButton: true,
})

const cartStore = useCartStore()
const route = useRoute()
const router = useRouter()

const searchOpen = ref(typeof route.query.q === 'string' && route.query.q.length > 0)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchInput = ref<HTMLInputElement | null>(null)
const menuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)

watch(
  () => (typeof route.query.q === 'string' ? route.query.q : ''),
  (value) => {
    if (value !== search.value) search.value = value
    if (value) searchOpen.value = true
  },
)

let timer: ReturnType<typeof setTimeout> | undefined

watch(search, (value) => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => applySearch(value), 250)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

function applySearch(value: string) {
  const trimmed = value.trim()
  const current = typeof route.query.q === 'string' ? route.query.q : ''
  if (trimmed === current && (route.name === 'store' || !trimmed)) return

  const query: Record<string, string> = {}
  if (typeof route.query.category === 'string' && route.query.category) {
    query.category = route.query.category
  }
  if (trimmed) query.q = trimmed

  void router.replace({ path: '/', query })
}

function goToSection(id: string) {
  menuOpen.value = false
  if (route.name === 'store') {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  void router.push({ path: '/', hash: `#${id}` })
}

async function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchInput.value?.focus()
    return
  }
  if (search.value) {
    search.value = ''
    applySearch('')
  }
}
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <div class="header-side">
        <RouterLink
          v-if="props.backButton"
          :to="props.BackLink"
          class="icon-btn burger"
          aria-label="Назад в каталог"
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
        </RouterLink>
        <button
          v-else
          type="button"
          class="icon-btn burger"
          :aria-expanded="menuOpen"
          aria-label="Меню"
          @click="menuOpen = !menuOpen"
        >
          <svg
            v-if="!menuOpen"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          >
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
          <svg
            v-else
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
        <nav class="nav" aria-label="Основное меню">
          <a href="/#catalog" @click.prevent="goToSection('catalog')">Каталог</a>
          <RouterLink to="/about">Обо мне</RouterLink>
          <RouterLink to="/terms">Доставка и оплата</RouterLink>
        </nav>
      </div>

      <RouterLink to="/" class="logo">Сказка Странствий</RouterLink>

      <div class="header-actions">
        <button
          type="button"
          class="icon-btn search-btn"
          :aria-expanded="searchOpen"
          aria-label="Поиск"
          @click="toggleSearch"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
        <RouterLink
          to="/cart"
          class="icon-btn cart-btn"
          :class="{ 'is-current': route.name === 'cart' }"
          :aria-label="`Корзина, товаров: ${cartStore.totalQuantity}`"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" />
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          </svg>
          <span v-if="cartStore.totalQuantity > 0" class="cart-badge">{{
            cartStore.totalQuantity
          }}</span>
        </RouterLink>
      </div>
    </div>

    <nav v-if="menuOpen" class="mobile-menu" aria-label="Меню">
      <a href="/#catalog" @click.prevent="goToSection('catalog')">Каталог</a>
      <RouterLink to="/about">Обо мне</RouterLink>
      <RouterLink to="/terms">Доставка и оплата</RouterLink>
    </nav>

    <div v-if="searchOpen" class="container header-search">
      <input
        ref="searchInput"
        v-model="search"
        type="search"
        placeholder="Поиск изделий"
        aria-label="Поиск изделий"
      />
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid #e8dfd3;
  background: var(--bg);
}

/* Линия и фон на всю ширину окна. Сама шапка остаётся в колонке,
   чтобы 100vw не сдвигал её на ширину полосы прокрутки. */
.site-header::before {
  content: '';
  position: absolute;
  z-index: 0;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 100vw;
  transform: translateX(-50%);
  background: var(--bg);
  border-bottom: 1px solid #e8dfd3;
  pointer-events: none;
}

.header-inner,
.mobile-menu,
.header-search {
  position: relative;
  z-index: 1;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding-left: 24px;
  padding-right: 24px;
}

.header-inner {
  padding-top: 14px;
  padding-bottom: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.header-side {
  min-width: 0;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 15px;
  font-weight: 500;
}

.nav a {
  text-decoration: none;
  color: var(--muted-2);
}

.nav a:hover,
.nav a[aria-current='page'] {
  color: var(--accent);
}

.mobile-menu {
  display: none;
}

.logo {
  font-family: 'Skazka Stranstvij', cursive;
  font-size: 52px;
  line-height: 1;
  color: var(--ink);
  white-space: nowrap;
  text-decoration: none;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
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
  text-decoration: none;
}

.icon-btn:hover {
  background: var(--sand);
}

.icon-btn.burger {
  display: none;
}

.cart-btn {
  position: relative;
}

.cart-btn.is-current {
  background: var(--sand);
}

.cart-badge {
  position: absolute;
  top: 4px;
  right: 3px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.header-search {
  padding-bottom: 14px;
}

.header-search input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--line-strong);
  border-radius: 22px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 15px;
}

.header-search input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

@media (max-width: 720px) {
  .site-header {
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .container {
    padding-left: 16px;
    padding-right: 16px;
  }

  .header-inner {
    height: 64px;
    padding: 0 8px;
    grid-template-columns: 48px minmax(0, 1fr) 48px;
    gap: 0;
  }

  .icon-btn.burger {
    display: flex;
  }

  .nav,
  .search-btn {
    display: none;
  }

  .logo {
    justify-self: center;
    font-size: 44px;
  }

  .mobile-menu {
    display: flex;
    flex-direction: column;
    padding: 4px 16px 12px;
    border-top: 1px solid #e8dfd3;
    background: var(--bg);
  }

  .mobile-menu a {
    padding: 12px 8px;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    text-decoration: none;
  }

  .mobile-menu a[aria-current='page'] {
    color: var(--accent);
  }
}
</style>
