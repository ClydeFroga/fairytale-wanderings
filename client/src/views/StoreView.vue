<script setup lang="ts">
import Header from '@/components/global/Header.vue'
import Search from '@/components/global/Search.vue'
import Categories from '@/components/global/Categories.vue'
import ProductMenu from '@/components/product/ProductMenu.vue'
import { ref, onMounted, type Ref } from 'vue'
import type { IProduct } from '@/components/product/IProduct'
import { ROOT_URL } from '@/config'

//Грузим с сервера
const products: Ref<IProduct[]> = ref([])

onMounted(() => {
  fetch(`${ROOT_URL}/products`)
    .then((res) => res.json())
    .then((data) => (products.value = data))
})
</script>

<template>
  <main
    class="relative flex size-full min-h-screen flex-col bg-[#fcfaf8] justify-between group/design-root overflow-x-hidden"
  >
    <div>
      <Header :backButton="false" :BackLink="'/'" />
      <Search />
      <Categories />

      <div class="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
        <ProductMenu v-for="product in products" :key="product._id" :product="product" />
      </div>
    </div>
  </main>
</template>

<style scoped></style>
