<script>
import Table from '../components/Table.vue'

export default {
  name: 'HomeView',
  components: {
    Table,
  },
}
</script>

<template>
  <main class="container mx-auto px-4 py-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-6">Система управления заказами</h1>
      <div class="bg-white rounded-lg shadow-md p-6 mt-5">
        <Table />
      </div>
    </div>
  </main>
</template>

<style scoped>
main {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>
