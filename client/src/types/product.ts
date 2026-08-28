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
  // Параметры посылки для расчёта доставки: вес в граммах, габариты в см
  // (в упакованном виде). null — у товара не заполнено, берётся коробка
  // по умолчанию с сервера (см. scripts/parcel.ts).
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  details: {
    [key: string]: string
  }
}
