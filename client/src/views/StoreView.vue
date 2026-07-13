<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import Search from '@/components/global/Search.vue'
import Categories from '@/components/global/Categories.vue'
import ProductMenu from '@/components/product/ProductMenu.vue'
import { ref, onMounted, type Ref } from 'vue'
import type { IProduct } from '@/components/product/IProduct'
import { getProducts } from '@/api/products'

const products: Ref<IProduct[]> = ref([])
const categories: Ref<{ param: string; text: string }[]> = ref([
  { param: 'new', text: 'Новое' },
  { param: 'popular', text: 'Популярное' },
  { param: 'best', text: 'Лучшее' },
])

onMounted(() => {
  getProducts().then((data) => (products.value = data))
})
</script>

<template>
  <main
    class="relative flex size-full min-h-screen flex-col bg-[#fcfaf8] justify-between group/design-root overflow-x-hidden"
  >
    <div>
      <Header :backButton="false" :BackLink="'/'" />
      <Search @results="products = $event" />
      <Categories :categories="categories" />

      <div class="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-4">
        <ProductMenu v-for="product in products" :key="product._id" :product="product" />
      </div>
    </div>
  </main>
</template>

<style scoped></style>
