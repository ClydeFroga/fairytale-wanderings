import type { CartItem } from '@/stores/cart'
import { createOrder, type OrderDelivery } from '@/api/orders'
import { getInitData } from '@/scripts/telegram'

export type OrderInput = {
  items: CartItem[]
  delivery: OrderDelivery
  name: string
  phone: string
  email: string
}

export class Order {
  constructor(private readonly input: OrderInput) {}

  send() {
    const email = this.input.email.trim()

    return createOrder({
      items: this.input.items.map(({ product, quantity }) => ({
        productId: product._id,
        quantity,
      })),
      // Способ доставки, адрес и (для СДЭК) точку с тарифом собирает стор корзины.
      ...this.input.delivery,
      customerName: this.input.name,
      contact: this.input.phone,
      // Пустую почту не шлём вовсе — сервер валидирует формат только у заданной.
      email: email || undefined,
      initData: getInitData(),
    })
  }
}
