import { and, eq, gte, inArray, sql, desc, asc, getTableColumns } from 'drizzle-orm'
import { db, type DB } from '../DatabaseSingleton'
import { products, categories } from '../shema'
import type { IProduct, INewProduct } from '../shema'
import type { ProductListFilters, ProductView } from '../types'
import { buildProductListConditions } from '../filters/product'

// Проекция товара с присоединённым именем/slug категории (для витрины).
const productView = {
  ...getTableColumns(products),
  category: categories.name,
  categorySlug: categories.slug,
}

export class ProductMethods {
  static getList(filters?: ProductListFilters): Promise<ProductView[]> {
    const conditions = buildProductListConditions(filters)
    return db
      .select(productView)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(products.stock), asc(products.name))
  }

  static async getById(id: string): Promise<ProductView | null> {
    const [row] = await db
      .select(productView)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products._id, id))
      .limit(1)
    return row ?? null
  }

  static async getBySlug(slug: string): Promise<ProductView | null> {
    const [row] = await db
      .select(productView)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .limit(1)
    return row ?? null
  }

  static async listSlugs(): Promise<string[]> {
    const rows = await db.select({ slug: products.slug }).from(products)
    return rows.map((row) => row.slug)
  }

  static getByIds(ids: string[]): Promise<IProduct[]> {
    if (ids.length === 0) return Promise.resolve([])
    return db.select().from(products).where(inArray(products._id, ids))
  }

  static async create(product: INewProduct): Promise<IProduct> {
    const [row] = await db.insert(products).values(product).returning()
    return row!
  }

  static async update(id: string, product: Partial<INewProduct>): Promise<IProduct | null> {
    const [row] = await db.update(products).set(product).where(eq(products._id, id)).returning()
    return row ?? null
  }

  static async remove(id: string): Promise<string[] | null | undefined> {
    const [row] = await db.delete(products).where(eq(products._id, id)).returning()
    return row?.image
  }

  // Атомарное списание: true, если остатка хватило (условие stock >= qty отсекает гонки).
  static async decrementStock(id: string, qty: number, conn: DB = db): Promise<boolean> {
    const res = await conn
      .update(products)
      .set({ stock: sql`${products.stock} - ${qty}` })
      .where(and(eq(products._id, id), gte(products.stock, qty)))
      .returning({ stock: products.stock })
    return res.length > 0
  }

  // Возврат остатка при отмене неоплаченного заказа.
  static async incrementStock(id: string, qty: number, conn: DB = db): Promise<void> {
    await conn
      .update(products)
      .set({ stock: sql`${products.stock} + ${qty}` })
      .where(eq(products._id, id))
  }
}
