import { apiClient } from '@/api/client'

export type StockShortage = {
  productId: string
  available: number
  requested: number
}

/** Способ доставки: ПВЗ/постамат СДЭК, курьер СДЭК или адрес, введённый руками. */
export type DeliveryMethod = 'cdek_office' | 'cdek_door' | 'manual'

/** Часть заказа про доставку — в том виде, в каком её ждёт сервер. */
export type OrderDelivery = {
  deliveryMethod: DeliveryMethod
  deliveryAddress: string
  deliveryPointCode?: string // код ПВЗ — только для cdek_office
  deliveryTariffCode?: number
  deliveryPrice?: number // стоимость, посчитанная виджетом
}

export type CreateOrderBody = OrderDelivery & {
  items: {
    productId: string
    quantity: number
  }[]
  customerName?: string
  contact?: string
  email?: string
  initData?: string
}

export function createOrder(body: CreateOrderBody) {
  return apiClient.requestJson('/orders/create', { method: 'POST', body })
}

// --- CRM ---

/** Цепочка статусов заказа (совпадает с enum order_status на сервере). */
export const ORDER_FLOW = ['created', 'paid', 'assembled', 'shipped', 'completed'] as const

export type OrderStatus = (typeof ORDER_FLOW)[number] | 'cancelled'

export type OrderItem = {
  productId: string | null
  name: string
  quantity: number
  price: number
}

/** Телеграм покупателя: есть только у заказов из Mini App. */
export type OrderTelegram = {
  id: number
  username: string | null
  name: string | null
}

export type IOrder = {
  id: string
  customerName: string | null
  contact: string | null
  email: string | null
  telegram: OrderTelegram | null
  deliveryMethod: DeliveryMethod | null
  deliveryAddress: string | null
  deliveryPointCode: string | null
  deliveryTariffCode: number | null
  deliveryPrice: number | null
  comment: string | null
  totalPrice: number
  status: OrderStatus
  channel: 'web' | 'telegram'
  createdAt: string
  updatedAt: string
  items: OrderItem[]
}

export function getOrders() {
  return apiClient.requestJson<IOrder[]>('/orders')
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  return apiClient.requestJson<IOrder>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: { status },
  })
}
