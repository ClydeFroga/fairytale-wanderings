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
  <div class="">
    <h1 class="text-3xl font-bold mb-6">Система управления заказами</h1>
    <div class="bg-white rounded-lg shadow-md p-6 mt-5">
      <Table />
    </div>
  </div>
</template>

<style scoped>
main {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>
