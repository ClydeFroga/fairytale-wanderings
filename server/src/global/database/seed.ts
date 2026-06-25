import { db, DatabaseSingleton } from "./DatabaseSingleton";
import { products } from "./shema";
import { seedProducts } from "./seed/seedProducts";

async function seed() {
  console.log("Засеваем товары...");

  // Чистим таблицу, чтобы сид был идемпотентным (ОСТОРОЖНО: удаляет все товары).
  await db.delete(products);

  const inserted = await seedProducts();

  console.log(`Добавлено товаров: ${inserted.length}`);
  for (const p of inserted)
    console.log(`  • ${p.name} — ${p.price}₽, на складе: ${p.stock} (${p._id})`);

  await DatabaseSingleton.getInstance().disconnect();
}

seed().catch((error) => {
  console.error("Ошибка сидинга:", error);
  process.exit(1);
});
