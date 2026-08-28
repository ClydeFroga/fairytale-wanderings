<script lang="ts" setup>
import Header from '@/components/global/Header.vue'
import type { IProduct } from '@/types/product'
import { computed, onMounted, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { getProduct } from '@/api/products'
import AddToBusketButton from '@/components/global/AddToBusketButton.vue'
import Gallery from '@/components/global/Gallery.vue'
import { imageUrls } from '@/scripts/images'

const product: Ref<IProduct> = ref({
  _id: '',
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

// Пути из БД относительные — приводим к URL API (см. scripts/images).
const gallery = computed(() => imageUrls(product.value.image))

const route = useRoute()

onMounted(async () => {
  if (props.product) {
    product.value = props.product
    return
  }

  try {
    product.value = await getProduct(String(route.params.id))
  } catch (error) {
    console.error(error)
  }
})
</script>

<template>
  <article>
    <div
      class="relative flex size-full min-h-screen flex-col justify-between lg:justify-start overflow-x-hidden"
    >
      <Header :BackLink="'/'" />
      <div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(158px,1fr))] gap-3 p-4">
          <div class="flex flex-col gap-3 pb-3">
            <Gallery :image="gallery" />

            <div>
              <p class="text-base font-medium leading-normal">
                {{ product.name }}
              </p>
              <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">
                {{ product.price }} ₽
              </p>
            </div>
          </div>
        </div>
        <p class="text-base font-normal leading-normal pb-3 pt-1 px-4">
          {{ product.description }}
        </p>

        <p class="pb-3 pt-1 px-4 stock">осталось {{ product.stock }} шт.</p>

        <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
          Детали
        </h2>

        <div
          v-if="product.details && Object.keys(product.details).length > 0"
          class="grid grid-cols-[20%_1fr] gap-x-6"
        >
          <div
            v-for="[key, value] in Object.entries(product.details)"
            class="col-span-2 grid grid-cols-subgrid border-t border-t-(--vt-c-divider-light-1) py-5 p-4"
          >
            <p class="text-(--vt-c-text-light-2) text-sm font-normal leading-normal">
              {{ key }}
            </p>
            <p class="text-sm font-normal leading-normal">{{ value }}</p>
          </div>
        </div>
      </div>

      <div>
        <div class="flex px-4 py-3 mb-5">
          <AddToBusketButton
            :text="product.stock === 0 ? 'Нет в наличии' : 'Добавить в корзину'"
            :product="product"
            :disabled="product.stock === 0"
          />
        </div>
      </div>
    </div>
  </article>
</template>
