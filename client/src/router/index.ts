import { nextTick } from 'vue'
import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import StoreView from '../views/StoreView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import CommonLayout from '@/layouts/CommonLayout.vue'
import { loginAdmin } from '@/api/auth'

// Пускаем в /admin только админов. Иначе — показываем 404 (без раскрытия
// существования раздела), сохраняя исходный URL через catch-all маршрут.
// Заодно это вход в админку: сервер ставит куку сессии, и мутирующие запросы
// CRM уходят уже авторизованными.
async function requireAdmin(to: RouteLocationNormalized) {
  // В деве мы не внутри Telegram (initData нет) — открываем CRM без проверки.
  // Серверная сторона в этом случае открывается через ADMIN_AUTH_DISABLED.
  if (import.meta.env.DEV) return true

  try {
    const admin = await loginAdmin()
    if (admin?.isAdmin) return true
  } catch {
    // 401/403 или сеть — трактуем как отсутствие прав.
  }
  return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }
}

// StoreView — стартовый экран, грузим сразу. Остальные view (и вся CRM)
// разбиваются на отдельные чанки и подгружаются по требованию.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    // Якорь на другую страницу прокручиваем сами, уже внутри перехода:
    // координаты роутера в этот момент смещены и прокрутка сбрасывается.
    if (to.hash) {
      // На время смены страницы остаёмся у верха: якорь доскроллим после перехода.
      if (pageTransitionActive() && to.path !== from.path) return { top: 0, behavior: 'auto' }
      return { el: to.hash, behavior: 'smooth' }
    }
    if (to.path !== from.path) return { top: 0, behavior: 'auto' }
    return false
  },
  routes: [
    {
      path: '/admin',
      name: 'admin',
      component: AdminLayout,
      beforeEnter: requireAdmin,
      children: [
        {
          path: '',
          name: 'crm',
          component: () => import('../views/CRMView.vue'),
        },
      ],
    },
    {
      path: '/',
      name: 'common',
      component: CommonLayout,
      children: [
        { path: '', name: 'store', component: StoreView },

        {
          path: '/product/:slug',
          name: 'product',
          component: () => import('../views/ProductPageView.vue'),
        },
        {
          path: '/cart',
          name: 'cart',
          component: () => import('../views/CartView.vue'),
        },
        {
          // Сюда возвращает Робокасса (через /payments/robokassa/success|fail)
          // и сюда же ведёт оформление без онлайн-оплаты.
          path: '/order/:id',
          name: 'order',
          component: () => import('../views/OrderView.vue'),
        },
        {
          path: '/about',
          name: 'about',
          component: () => import('../views/AboutView.vue'),
        },
        {
          path: '/terms',
          name: 'terms',
          component: () => import('../views/TermsView.vue'),
        },
      ],
    },
    {
      // Catch-all: несуществующие пути и запрет доступа к /admin.
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

function pageTransitionActive() {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function queryValue(route: RouteLocationNormalized, key: string) {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

function isCatalogChange(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  return (
    to.name === 'store' &&
    from.name === 'store' &&
    to.path === from.path &&
    (queryValue(to, 'category') !== queryValue(from, 'category') ||
      queryValue(to, 'q') !== queryValue(from, 'q'))
  )
}

// Кадр старой страницы растворяется в кадр новой. Иначе смена маршрута — резкий скачок.
// Та же смена, но только для сетки, когда на главной меняются категория или поиск.
router.beforeResolve((to, from) => {
  if (!pageTransitionActive()) return
  // Первый заход и смена только hash страницу не меняют.
  if (!from.matched.length) return
  if (to.path.startsWith('/admin') || from.path.startsWith('/admin')) return

  const catalogChange = isCatalogChange(to, from)
  if (to.path === from.path && !catalogChange) return

  const switchClass = catalogChange ? 'catalog-switch' : 'page-switch'

  return new Promise<void>((resolveNavigation) => {
    let resolveDom = () => {}
    const timeout = window.setTimeout(() => resolveDom(), 800)
    const stop = router.afterEach(() => {
      stop()
      window.clearTimeout(timeout)
      // Отрисовка и прокрутка наверх — до снимка нового кадра.
      void nextTick(() => nextTick(() => resolveDom()))
    })

    const clearSwitch = () => document.documentElement.classList.remove(switchClass)

    try {
      document.documentElement.classList.add(switchClass)
      const transition = document.startViewTransition(() => {
        return new Promise<void>((resolve) => {
          resolveDom = resolve
          resolveNavigation()
        })
      })
      const hash = to.hash
      const path = to.path
      transition.finished.finally(clearSwitch)
      transition.finished.then(() => {
        if (catalogChange || !hash || location.pathname !== path) return
        document
          .getElementById(hash.slice(1))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch {
      // Второй переход ещё не закончился — не держим навигацию.
      window.clearTimeout(timeout)
      stop()
      clearSwitch()
      resolveNavigation()
    }
  })
})

export default router
