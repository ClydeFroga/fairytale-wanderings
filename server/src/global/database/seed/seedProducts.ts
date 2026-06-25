import { db, type DB } from "../DatabaseSingleton";
import { products } from "../shema";
import type { IProduct } from "../shema";
import { seedProductsData } from "./data";

export async function seedProducts(conn: DB = db): Promise<IProduct[]> {
  return conn.insert(products).values(seedProductsData).returning();
}
