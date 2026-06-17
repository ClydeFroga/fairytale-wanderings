import { createRouter, createWebHistory } from 'vue-router'
import StoreView from '../views/StoreView.vue'
import CRMView from '../views/CRMView.vue'
import ProductPageView from '../views/ProductPageView.vue'
import CartView from '../views/CartView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/admin',
      name: 'admin',
      component: AdminLayout,
      children: [
        {
          path: '',
          name: 'crm',
          component: CRMView,
        },
      ],
    },
    {
      path: '/',
      name: 'store',
      component: StoreView,
    },
    {
      path: '/product/:id',
      name: 'product',
      component: ProductPageView,
    },
    {
      path: '/cart',
      name: 'cart',
      component: CartView,
    },
  ],
})

export default router
