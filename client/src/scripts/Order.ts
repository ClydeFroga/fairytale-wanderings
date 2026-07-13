import type { IProduct } from '@/components/product/IProduct'
import { createOrder } from '@/api/orders'

export class Order {
  products: Map<IProduct, number>
  address: string
  name: string
  phone: string

  constructor(products: Map<IProduct, number>, address: string, name: string, phone: string) {
    this.products = products
    this.address = address
    this.name = name
    this.phone = phone
  }

  send() {
    return createOrder({
      items: Array.from(this.products.entries()).map(([product, quantity]) => ({
        productId: product._id,
        quantity,
      })),
      deliveryAddress: this.address,
      customerName: this.name,
      contact: this.phone,
    })
  }
}
