<template>
  <div class="pb-3">
    <div class="flex border-b border-[#e7dbd0] px-4 gap-8">
      <div
        v-for="category in categories"
        class="flex flex-col items-center justify-center border-b-[#e88630] text-[#1b140e] pb-[13px] pt-4"
        :class="{ 'border-b-[#e88630]': isActive(category.param) }"
        @click="onClick(category.param)"
      >
        <p class="text-[#1b140e] text-sm font-bold leading-normal tracking-[0.015em]">
          {{ category.text }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  categories: {
    type: Array as PropType<
      {
        param: string
        text: string
      }[]
    >,
    required: true,
  },
})

const route = useRoute()
const router = useRouter()

const isActive = (category: string) => {
  return route.query.category === category
}

const onClick = (category: string) => {
  router.push({ query: { category } })
}
</script>
