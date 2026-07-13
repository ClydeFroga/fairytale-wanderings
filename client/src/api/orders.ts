import { apiClient } from '@/api/client'

export type StockShortage = {
  productId: string
  available: number
  requested: number
}

export type CreateOrderBody = {
  items: {
    productId: string
    quantity: number
  }[]
  deliveryAddress?: string
  customerName?: string
  contact?: string
}

export function createOrder(body: CreateOrderBody) {
  return apiClient.requestJson('/orders/create', { method: 'POST', body })
}
