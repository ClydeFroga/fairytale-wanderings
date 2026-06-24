import type { IProduct } from '@/components/product/IProduct'

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

  send() {}
}
