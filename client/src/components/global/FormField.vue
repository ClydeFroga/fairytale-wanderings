<script setup lang="ts">
import { computed } from 'vue'
import { vMaska } from 'maska/vue'

const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    hasError?: boolean
    mask?: string
    type?: string
    inputmode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal'
  }>(),
  {
    hasError: false,
    type: 'text',
  },
)

const inputClass = computed(() => [
  'form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl focus:outline-0 focus:ring-0 bg-(--color-background) h-14 placeholder:text-(--vt-c-text-light-2) p-[15px] text-base font-normal leading-normal',
  props.hasError
    ? 'border border-red-500 focus:border-red-500'
    : 'border border-(--vt-c-divider-light-1) focus:border-(--vt-c-divider-light-1)',
])
</script>

<template>
  <label class="flex flex-col min-w-40 flex-1">
    <p class="text-base font-medium leading-normal pb-2">{{ label }}</p>
    <input
      v-if="mask"
      v-model="model"
      v-maska="mask"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :class="inputClass"
      :aria-invalid="hasError"
    />
    <input
      v-else
      v-model="model"
      :type="type"
      :inputmode="inputmode"
      :placeholder="placeholder"
      :class="inputClass"
      :aria-invalid="hasError"
    />
  </label>
</template>
