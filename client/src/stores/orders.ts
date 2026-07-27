import { ref } from 'vue'
import { defineStore } from 'pinia'

// ВНИМАНИЕ: заказы CRM — пока локальные демо-данные. Список и смена статуса
// переедут на API позже; STAGES тогда синхронизируем с enum order_status на сервере.

export type CrmOrder = {
  id: string
  customer: string
  summary: string
  total: string
  stage: number
}

// Статусный флоу заказа. Порядок фиксирован: только вперёд по цепочке.
export const STAGES = ['создан', 'оплачен', 'собран', 'отправлен', 'завершён'] as const

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<CrmOrder[]>([
    { id: 'Заказ #1042', customer: 'Анна П.', summary: '2 позиции', total: '2 700 ₽', stage: 0 },
    { id: 'Заказ #1041', customer: 'Игорь С.', summary: '1 позиция', total: '1 800 ₽', stage: 2 },
    { id: 'Заказ #1039', customer: 'Лена М.', summary: '3 позиции', total: '5 250 ₽', stage: 3 },
    { id: 'Заказ #1035', customer: 'Дмитрий В.', summary: '1 позиция', total: '4 500 ₽', stage: 4 },
  ])

  // Двигаем заказ на один шаг вперёд по цепочке статусов.
  function advanceOrder(id: string) {
    const o = orders.value.find((x) => x.id === id)
    if (!o) return
    o.stage = Math.min(STAGES.length - 1, o.stage + 1)
  }

  return {
    orders,
    advanceOrder,
  }
})
