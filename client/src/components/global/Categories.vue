<template>
  <div class="pb-3">
    <div class="flex border-b border-[#e7dbd0] px-4 gap-8 overflow-x-auto">
      <button
        v-for="category in categories"
        :key="category.param"
        type="button"
        class="flex shrink-0 flex-col items-center justify-center border-b-2 pb-[13px] pt-4 transition-colors cursor-pointer"
        :class="isActive(category.param) ? 'border-b-[#e88630]' : 'border-b-transparent'"
        @click="onClick(category.param)"
      >
        <span
          class="text-sm font-bold leading-normal tracking-[0.015em]"
          :class="isActive(category.param) ? 'text-[#1b140e]' : 'text-[#97704e]'"
        >
          {{ category.text }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps({
  categories: {
    type: Array as PropType<{ param: string; text: string }[]>,
    required: true,
  },
})

const route = useRoute()
const router = useRouter()

// Пустой param — вкладка «Все»: активна, когда в query нет категории.
const isActive = (param: string) => {
  return (route.query.category ?? '') === param
}

const onClick = (param: string) => {
  router.push({ query: param ? { category: param } : {} })
}
</script>
