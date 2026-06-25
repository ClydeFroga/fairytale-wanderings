import { and, eq, gte, ilike, inArray, sql, type SQL } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { products } from "../shema";
import type { IProduct, INewProduct } from "../shema";
import type { ProductFilters } from "../types";

export class ProductMethods {
  static getActive(filters?: ProductFilters): Promise<IProduct[]> {
    const conditions: SQL[] = [eq(products.isActive, true)];
    if (filters?.name) conditions.push(ilike(products.name, `%${filters.name}%`));
    if (filters?.category) conditions.push(eq(products.category, filters.category));
    return db.select().from(products).where(and(...conditions));
  }

  static async getById(id: string): Promise<IProduct | null> {
    const [row] = await db.select().from(products).where(eq(products._id, id)).limit(1);
    return row ?? null;
  }

  static getByIds(ids: string[]): Promise<IProduct[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return db.select().from(products).where(inArray(products._id, ids));
  }

  static async create(product: INewProduct): Promise<IProduct> {
    const [row] = await db.insert(products).values(product).returning();
    return row!;
  }

  static async update(id: string, product: Partial<INewProduct>): Promise<IProduct | null> {
    const [row] = await db.update(products).set(product).where(eq(products._id, id)).returning();
    return row ?? null;
  }

  static async remove(id: string): Promise<string[] | null | undefined> {
    const [row] = await db.delete(products).where(eq(products._id, id)).returning();
    return row?.image;
  }

  // Атомарное списание: true, если остатка хватило (условие stock >= qty отсекает гонки).
  static async decrementStock(id: string, qty: number, conn: DB = db): Promise<boolean> {
    const res = await conn
      .update(products)
      .set({ stock: sql`${products.stock} - ${qty}` })
      .where(and(eq(products._id, id), gte(products.stock, qty)))
      .returning({ stock: products.stock });
    return res.length > 0;
  }
}
