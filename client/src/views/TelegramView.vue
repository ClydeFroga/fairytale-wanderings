<script setup lang="ts">
import ProductTelegram from '@/components/ProductTelegram.vue'

//Грузим с сервера
const products = ref([])

onMounted(() => {
  fetch('http://localhost:3000/products')
    .then((res) => res.json())
    .then((data) => (products.value = data))
})
</script>

<template>
  <main></main>
</template>
