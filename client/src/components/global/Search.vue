<script setup lang="ts">
import MagnifyingGlass from '@/assets/vector/MagnifyingGlass.vue'
import { getProducts } from '@/api/products'
import type { IProduct } from '@/components/product/IProduct'
import { onUnmounted, ref, watch } from 'vue'

const search = ref('')
const props = defineProps<{
  category?: string // slug активной категории — фильтруем вместе с поиском
}>()
const emit = defineEmits<{
  results: [products: IProduct[]]
}>()

let timeoutId: ReturnType<typeof setTimeout> | undefined

function runSearch(query?: string) {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  const trimmed = (query ?? search.value).trim()

  getProducts({
    name: trimmed || undefined,
    category: props.category || undefined,
  }).then((data) => emit('results', data))
}

watch(search, (newVal) => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  timeoutId = setTimeout(() => runSearch(newVal), 2000)
})

// Смена категории (вкладки) — сразу перезагружаем с текущим поисковым запросом.
watch(
  () => props.category,
  () => runSearch(),
)

function onEnter() {
  runSearch()
}

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})
</script>

<template>
  <div class="px-4 py-3">
    <label class="flex flex-col min-w-40 h-12 w-full">
      <div class="flex w-full flex-1 items-stretch rounded-xl h-full">
        <div
          class="text-[#97704e] flex border-none bg-[#f3ede7] items-center justify-center pl-4 rounded-l-xl border-r-0"
          data-icon="MagnifyingGlass"
          data-size="24px"
          data-weight="regular"
        >
          <MagnifyingGlass />
        </div>
        <input
          placeholder="Поиск изделий"
          class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#1b140e] focus:outline-0 focus:ring-0 border-none bg-[#f3ede7] focus:border-none h-full placeholder:text-[#97704e] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
          v-model="search"
          @keydown.enter="onEnter"
        />
      </div>
    </label>
  </div>
</template>
