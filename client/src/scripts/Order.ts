import type { IProduct } from '@/components/product/IProduct'

export class Order {
  constructor(
    public products: Map<IProduct, number>,
    public address: string,
  ) {}

  send() {
    console.log('send order')
  }
}
