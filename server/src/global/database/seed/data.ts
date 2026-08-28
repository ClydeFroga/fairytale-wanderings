import type { INewProduct, INewCategory } from "../shema";

export const seedCategoriesData: INewCategory[] = [
  { name: "Игрушки", slug: "toys", sortOrder: 1 },
  { name: "Декор", slug: "decor", sortOrder: 2 },
  { name: "Аксессуары", slug: "accessories", sortOrder: 3 },
  { name: "Для кухни", slug: "kitchen", sortOrder: 4 },
];

// Сид товаров. `categorySlug` резолвится в categoryId при вставке (см. seedProducts.ts).
// weight — граммы, length/width/height — сантиметры в упакованном виде: по ним
// считается доставка СДЭК (см. client/src/scripts/parcel.ts).
export type SeedProduct = Omit<INewProduct, "categoryId" | "slug"> & {
  categorySlug: string;
};

export const seedProductsData: SeedProduct[] = [
  {
    name: "Вязаный мишка Тедди",
    weight: 300,
    length: 30,
    width: 22,
    height: 18,
    price: 1800,
    stock: 5,
    categorySlug: "toys",
    description:
      "Мягкий мишка ручной вязки из хлопка, наполнитель — гипоаллергенный холлофайбер.",
    image: ["https://picsum.photos/seed/teddy/600/600"],
    details: { Материал: "хлопок", Высота: "25 см", Уход: "ручная стирка" },
  },
  {
    name: "Плед «Облако»",
    weight: 1800,
    length: 45,
    width: 35,
    height: 25,
    price: 4500,
    stock: 3,
    categorySlug: "decor",
    description:
      "Объёмный плед крупной вязки — мягкий и тёплый, для уютных вечеров.",
    image: ["https://picsum.photos/seed/blanket/600/600"],
    details: { Материал: "мериносовая шерсть", Размер: "120×150 см" },
  },
  {
    name: "Шапка-бини",
    weight: 150,
    length: 25,
    width: 20,
    height: 8,
    price: 1200,
    stock: 10,
    categorySlug: "accessories",
    description: "Тёплая шапка ручной вязки на зиму. Один размер.",
    image: ["https://picsum.photos/seed/beanie/600/600"],
    details: { Материал: "шерсть/акрил", Размер: "универсальный" },
  },
  {
    name: "Амигуруми «Котик»",
    weight: 90,
    length: 18,
    width: 14,
    height: 12,
    price: 900,
    stock: 8,
    categorySlug: "toys",
    description: "Маленькая вязаная игрушка-котик, помещается в ладони.",
    image: ["https://picsum.photos/seed/cat/600/600"],
    details: { Материал: "хлопок", Высота: "12 см" },
  },
  {
    name: "Прихватки (пара)",
    weight: 180,
    length: 22,
    width: 18,
    height: 6,
    price: 650,
    stock: 12,
    categorySlug: "kitchen",
    description: "Набор из двух вязаных прихваток для кухни, плотная двойная вязка.",
    image: ["https://picsum.photos/seed/potholder/600/600"],
    details: { Материал: "хлопок", Количество: "2 шт" },
  },
];
