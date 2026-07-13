export interface IProduct {
  _id: string
  name: string
  price: number
  image: string[]
  category: string
  description: string
  isActive: boolean
  stock: number
  details: {
    [key: string]: string
  }
}
