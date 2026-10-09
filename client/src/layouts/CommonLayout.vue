<script setup lang="ts">
import Footer from '@/components/global/Footer.vue'
</script>

<template>
  <main class="container">
    <router-view />
  </main>
  <Footer />
</template>

<style scoped>
.container {
  max-width: 1280px;
  margin: 0 auto;
  font-weight: normal;
}
</style>
