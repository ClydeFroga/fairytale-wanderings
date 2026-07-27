import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import StoreView from '../views/StoreView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import CommonLayout from '@/layouts/CommonLayout.vue'
import { getMe } from '@/api/users'

// Пускаем в /admin только админов. Иначе — показываем 404 (без раскрытия
// существования раздела), сохраняя исходный URL через catch-all маршрут.
async function requireAdmin(to: RouteLocationNormalized) {
  // В деве мы не внутри Telegram (initData нет) — открываем CRM без проверки.
  if (import.meta.env.DEV) return true

  try {
    const me = await getMe()
    if (me?.isAdmin) return true
  } catch {
    // Не удалось подтвердить доступ — трактуем как отсутствие прав.
  }
  return { name: 'not-found', params: { pathMatch: to.path.slice(1).split('/') } }
}

// StoreView — стартовый экран, грузим сразу. Остальные view (и вся CRM)
// разбиваются на отдельные чанки и подгружаются по требованию.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
          path: '/product/:id',
          name: 'product',
          component: () => import('../views/ProductPageView.vue'),
        },
        {
          path: '/cart',
          name: 'cart',
          component: () => import('../views/CartView.vue'),
        },
        {
          path: '/order/success',
          name: 'order-success',
          component: () => import('../views/OrderSuccessView.vue'),
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

export default router
