<script setup lang="ts">
import { onMounted } from 'vue'
import { initTelegram } from '@/scripts/telegram'

onMounted(() => {
  initTelegram()
})
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
