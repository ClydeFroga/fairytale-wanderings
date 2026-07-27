import type { CartItem } from '@/stores/cart'
import { createOrder } from '@/api/orders'
import { getInitData } from '@/scripts/telegram'

export class Order {
  items: CartItem[]
  address: string
  name: string
  phone: string
  email: string

  constructor(items: CartItem[], address: string, name: string, phone: string, email = '') {
    this.items = items
    this.address = address
    this.name = name
    this.phone = phone
    this.email = email
  }

  send() {
    const email = this.email.trim()

    return createOrder({
      items: this.items.map(({ product, quantity }) => ({
        productId: product._id,
        quantity,
      })),
      deliveryAddress: this.address,
      customerName: this.name,
      contact: this.phone,
      // Пустую почту не шлём вовсе — сервер валидирует формат только у заданной.
      email: email || undefined,
      initData: getInitData(),
    })
  }
}
