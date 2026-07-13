<script setup lang="ts">
defineProps({
  text: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button
    :disabled="disabled"
    class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-[#e88630] text-[#1b140e] text-base font-bold leading-normal tracking-[0.015em] disabled:cursor-not-allowed"
  >
    <span class="truncate">{{ text }}</span>
  </button>
</template>

<style scoped>
button:disabled {
  opacity: 0.6;
}

button {
  transition: transform 0.1s ease-in-out;
}

button:active {
  transform: scale(0.98);
}
</style>
