import type { CartItem } from '@/stores/cart'
import { createOrder } from '@/api/orders'
import { getInitData } from '@/scripts/telegram'

export class Order {
  items: CartItem[]
  address: string
  name: string
  phone: string

  constructor(items: CartItem[], address: string, name: string, phone: string) {
    this.items = items
    this.address = address
    this.name = name
    this.phone = phone
  }

  send() {
    return createOrder({
      items: this.items.map(({ product, quantity }) => ({
        productId: product._id,
        quantity,
      })),
      deliveryAddress: this.address,
      customerName: this.name,
      contact: this.phone,
      initData: getInitData(),
    })
  }
}
