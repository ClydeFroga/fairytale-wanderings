<script setup lang="ts">
import { ref } from 'vue'

interface Order {
  id: number
  customerName: string
  orderDate: string
  status: string
  totalAmount: number
  items: string[]
}

// Демо-данные для таблицы заказов
const orders = ref<Order[]>([
  {
    id: 1,
    customerName: 'Иван Петров',
    orderDate: '2023-10-15',
    status: 'Выполнен',
    totalAmount: 5400,
    items: ['Книга "Приключения"', 'Набор открыток'],
  },
  {
    id: 2,
    customerName: 'Елена Смирнова',
    orderDate: '2023-10-20',
    status: 'В обработке',
    totalAmount: 2800,
    items: ['Сказки для детей', 'Путеводитель'],
  },
  {
    id: 3,
    customerName: 'Алексей Иванов',
    orderDate: '2023-10-22',
    status: 'Доставляется',
    totalAmount: 3750,
    items: ['Атлас путешествий', 'Волшебная история'],
  },
])
</script>

<template>
  <div class="orders-table">
    <h2 class="text-2xl font-bold mb-4">Список заказов</h2>

    <table class="min-w-full bg-white border border-gray-200">
      <thead>
        <tr class="bg-gray-100">
          <th class="py-2 px-4 border-b text-left">№</th>
          <th class="py-2 px-4 border-b text-left">Клиент</th>
          <th class="py-2 px-4 border-b text-left">Дата</th>
          <th class="py-2 px-4 border-b text-left">Статус</th>
          <th class="py-2 px-4 border-b text-left">Сумма</th>
          <th class="py-2 px-4 border-b text-left">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50">
          <td class="py-2 px-4 border-b">{{ order.id }}</td>
          <td class="py-2 px-4 border-b">{{ order.customerName }}</td>
          <td class="py-2 px-4 border-b">{{ order.orderDate }}</td>
          <td class="py-2 px-4 border-b">
            <span
              :class="{
                'px-2 py-1 rounded text-sm font-medium': true,
                'bg-green-100 text-green-800': order.status === 'Выполнен',
                'bg-blue-100 text-blue-800': order.status === 'В обработке',
                'bg-yellow-100 text-yellow-800': order.status === 'Доставляется',
              }"
            >
              {{ order.status }}
            </span>
          </td>
          <td class="py-2 px-4 border-b">{{ order.totalAmount }} ₽</td>
          <td class="py-2 px-4 border-b">
            <button class="text-blue-500 hover:text-blue-700 mr-2">Детали</button>
            <button class="text-red-500 hover:text-red-700">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.orders-table {
  margin: 20px 0;
  width: 100%;
  overflow-x: auto;
}
</style>
