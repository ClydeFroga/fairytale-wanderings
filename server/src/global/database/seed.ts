import { db, DatabaseSingleton } from "./DatabaseSingleton";
import { products, categories, orders, orderItems } from "./shema";
import { seedProducts } from "./seed/seedProducts";

async function seed() {
  console.log("Засеваем товары...");

  // Чистим таблицы, чтобы сид был идемпотентным (ОСТОРОЖНО: удаляет товары, категории И заказы).
  // Порядок — по внешним ключам: order_items → orders → products → categories.
  // (order_items.product_id ссылается на products без ON DELETE, поэтому позиции удаляем первыми.)
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(categories);

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
