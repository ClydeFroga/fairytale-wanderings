import { sql } from "drizzle-orm";
import { db } from "@global/database/DatabaseSingleton";
import type { IProduct } from "@global/database/shema";
import { seedProducts } from "@global/database/seed/seedProducts";

export async function resetDatabase(): Promise<IProduct[]> {
  await db.execute(
    sql`TRUNCATE TABLE order_items, orders, products, categories, users RESTART IDENTITY CASCADE`,
  );
  return seedProducts();
}
