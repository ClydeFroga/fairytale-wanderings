import { db, DatabaseSingleton } from "./DatabaseSingleton";
import { products } from "./shema";
import type { INewProduct } from "./shema";

// 5 примеров товаров для наполнения витрины.
const seedProducts: INewProduct[] = [
  {
    name: "Вязаный мишка Тедди",
    price: 1800,
    stock: 5,
    category: "toys",
    description:
      "Мягкий мишка ручной вязки из хлопка, наполнитель — гипоаллергенный холлофайбер.",
    image: ["https://picsum.photos/seed/teddy/600/600"],
    details: { Материал: "хлопок", Высота: "25 см", Уход: "ручная стирка" },
  },
  {
    name: "Плед «Облако»",
    price: 4500,
    stock: 3,
    category: "decor",
    description:
      "Объёмный плед крупной вязки — мягкий и тёплый, для уютных вечеров.",
    image: ["https://picsum.photos/seed/blanket/600/600"],
    details: { Материал: "мериносовая шерсть", Размер: "120×150 см" },
  },
  {
    name: "Шапка-бини",
    price: 1200,
    stock: 10,
    category: "accessories",
    description: "Тёплая шапка ручной вязки на зиму. Один размер.",
    image: ["https://picsum.photos/seed/beanie/600/600"],
    details: { Материал: "шерсть/акрил", Размер: "универсальный" },
  },
  {
    name: "Амигуруми «Котик»",
    price: 900,
    stock: 8,
    category: "toys",
    description: "Маленькая вязаная игрушка-котик, помещается в ладони.",
    image: ["https://picsum.photos/seed/cat/600/600"],
    details: { Материал: "хлопок", Высота: "12 см" },
  },
  {
    name: "Прихватки (пара)",
    price: 650,
    stock: 12,
    category: "kitchen",
    description: "Набор из двух вязаных прихваток для кухни, плотная двойная вязка.",
    image: ["https://picsum.photos/seed/potholder/600/600"],
    details: { Материал: "хлопок", Количество: "2 шт" },
  },
];

async function seed() {
  console.log("Засеваем товары...");

  // Чистим таблицу, чтобы сид был идемпотентным (ОСТОРОЖНО: удаляет все товары).
  await db.delete(products);

  const inserted = await db.insert(products).values(seedProducts).returning();

  console.log(`Добавлено товаров: ${inserted.length}`);
  for (const p of inserted)
    console.log(`  • ${p.name} — ${p.price}₽, на складе: ${p.stock} (${p._id})`);

  await DatabaseSingleton.getInstance().disconnect();
}

seed().catch((error) => {
  console.error("Ошибка сидинга:", error);
  process.exit(1);
});
