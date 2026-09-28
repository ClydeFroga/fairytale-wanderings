import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getOrders,
  updateOrderStatus,
  ORDER_FLOW,
  type DeliveryMethod,
  type IOrder,
  type OrderStatus,
  type OrderTelegram,
} from '@/api/orders'

// Подписи этапов — в том же порядке, что и ORDER_FLOW на сервере.
export const STAGES = ['создан', 'оплачен', 'собран', 'отправлен', 'завершён'] as const

// Отображаемая модель заказа в CRM.
export type CrmOrder = {
  id: string
  number: string // Заказ №42
  customer: string
  contact: string
  email: string
  telegram: OrderTelegram | null
  telegramLink: string | null // ссылка на личку, если покупатель оставил username
  address: string
  delivery: string // способ доставки: ПВЗ с кодом и стоимость (если выбран СДЭК)
  payment: string // оплачен когда и чем / ждёт оплаты / без онлайн-оплаты
  date: string
  total: string
  summary: string
  items: IOrder['items']
  status: OrderStatus
  stage: number // индекс в STAGES; для отменённого — этап, на котором остановились
  cancelled: boolean
  channel: IOrder['channel']
}

function formatPrice(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  cdek_office: 'СДЭК, пункт выдачи',
  cdek_door: 'СДЭК, курьером',
  manual: 'Адрес покупателя',
}

// Способ доставки строкой: код ПВЗ нужен, чтобы оформить отправку; цена входит в сумму заказа.
function deliveryLabel(order: IOrder): string {
  if (!order.deliveryMethod) return ''

  const point = order.deliveryPointCode ? ` (${order.deliveryPointCode})` : ''
  const price = order.deliveryPrice ? ` · доставка ${formatPrice(order.deliveryPrice)}` : ''

  return `${DELIVERY_LABEL[order.deliveryMethod] ?? order.deliveryMethod}${point}${price}`
}

// Состояние оплаты. «Оплачен» показываем и у отменённого заказа — значит,
// оплата пришла после отмены и покупателю нужен возврат.
function paymentLabel(order: IOrder): string {
  if (order.paidAt) {
    const method = order.paymentMethod ? ` · ${order.paymentMethod}` : ''
    return `Оплачен ${formatDate(order.paidAt)}${method}`
  }
  if (order.status !== 'created') return ''
  if (!order.paymentExpiresAt) return 'Без онлайн-оплаты'

  const minutesLeft = Math.ceil((new Date(order.paymentExpiresAt).getTime() - Date.now()) / 60_000)
  return minutesLeft > 0 ? `Ждёт оплаты · осталось ${minutesLeft} мин` : 'Срок оплаты истёк'
}

function itemsSummary(items: IOrder['items']): string {
  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  if (count === 1) return '1 позиция'
  if (count >= 2 && count <= 4) return `${count} позиции`
  return `${count} позиций`
}

function fromApi(order: IOrder): CrmOrder {
  const flowIndex = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number])
  const items = order.items ?? []

  return {
    id: order.id,
    number: `Заказ №${order.number}`,
    customer: order.customerName || 'Без имени',
    contact: order.contact || '',
    email: order.email || '',
    telegram: order.telegram,
    // Написать можно только по username; по одному id ссылку не построить.
    telegramLink: order.telegram?.username ? `https://t.me/${order.telegram.username}` : null,
    address: order.deliveryAddress || '',
    delivery: deliveryLabel(order),
    payment: paymentLabel(order),
    date: formatDate(order.createdAt),
    total: formatPrice(order.totalPrice),
    summary: itemsSummary(items),
    items,
    status: order.status,
    // Отменённый заказ в цепочку не попадает — показываем его отдельным состоянием.
    stage: flowIndex === -1 ? 0 : flowIndex,
    cancelled: order.status === 'cancelled',
    channel: order.channel,
  }
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<CrmOrder[]>([])
  const loading = ref(false)
  // error — не удалось загрузить список (показываем вместо него),
  // actionError — не удалось сменить статус (список остаётся на месте).
  const error = ref('')
  const actionError = ref('')
  const updatingId = ref<string | null>(null)

  const orderCountLabel = computed(() => {
    const active = orders.value.filter((o) => !o.cancelled && o.stage < STAGES.length - 1).length
    return `${orders.value.length} заказов · ${active} в работе`
  })

  async function loadOrders() {
    loading.value = true
    error.value = ''
    try {
      orders.value = (await getOrders()).map(fromApi)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить заказы'
    } finally {
      loading.value = false
    }
  }

  async function setStatus(id: string, status: OrderStatus) {
    updatingId.value = id
    actionError.value = ''
    try {
      const updated = await updateOrderStatus(id, status)
      orders.value = orders.value.map((o) => (o.id === id ? fromApi(updated) : o))
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : 'Не удалось изменить статус'
    } finally {
      updatingId.value = null
    }
  }

  /** Следующий статус по цепочке; null — заказ уже завершён или отменён. */
  function nextStatus(order: CrmOrder): OrderStatus | null {
    if (order.cancelled) return null
    return ORDER_FLOW[order.stage + 1] ?? null
  }

  async function advanceOrder(id: string) {
    const order = orders.value.find((o) => o.id === id)
    const next = order && nextStatus(order)
    if (next) await setStatus(id, next)
  }

  async function cancelOrder(id: string) {
    await setStatus(id, 'cancelled')
  }

  return {
    orders,
    loading,
    error,
    actionError,
    updatingId,
    orderCountLabel,
    loadOrders,
    nextStatus,
    advanceOrder,
    cancelOrder,
  }
})
