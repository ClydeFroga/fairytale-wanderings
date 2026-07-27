export interface IProduct {
  _id: string
  name: string
  price: number
  image: string[]
  category: string | null // отображаемое имя категории (join на сервере)
  categorySlug: string | null
  categoryId: string | null
  description: string
  isActive: boolean
  stock: number
  details: {
    [key: string]: string
  }
}
