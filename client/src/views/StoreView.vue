<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import Search from '@/components/global/Search.vue'
import Categories from '@/components/global/Categories.vue'
import ProductMenu from '@/components/product/ProductMenu.vue'
import { ref, onMounted, computed, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import type { IProduct } from '@/types/product'
import { getProducts } from '@/api/products'
import { getCategories, type ICategory } from '@/api/categories'

const route = useRoute()

const products: Ref<IProduct[]> = ref([])
const categoriesList: Ref<ICategory[]> = ref([])

// Вкладки: «Все» + категории из БД.
const categoryTabs = computed(() => [
  { param: '', text: 'Все' },
  ...categoriesList.value.map((c) => ({ param: c.slug, text: c.name })),
])

// Активная категория (slug) из query — строкой либо undefined.
const activeCategory = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : undefined,
)

onMounted(async () => {
  categoriesList.value = await getCategories()
  products.value = await getProducts({ category: activeCategory.value })
})
</script>

<template>
  <main
    class="relative flex size-full min-h-screen flex-col bg-(--color-background) justify-between group/design-root overflow-x-hidden"
  >
    <div>
      <Header :backButton="false" :BackLink="'/'" />
      <Search :category="activeCategory" @results="products = $event" />
      <Categories :categories="categoryTabs" />

      <div class="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 p-4">
        <ProductMenu v-for="product in products" :key="product._id" :product="product" />
      </div>
    </div>
  </main>
</template>

<style scoped></style>
