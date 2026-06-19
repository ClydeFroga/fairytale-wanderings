import { and, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { db } from "../../database/DatabaseSingleton";
import { products } from "../../database/shema";
import type { IProduct, INewProduct } from "../../database/shema";

export interface ProductFilters {
  name?: string;
  category?: string;
}

export class ProductService {
  // Получаем все активные продукты с учётом фильтров
  static async getProducts(filters?: ProductFilters): Promise<IProduct[]> {
    const conditions: SQL[] = [eq(products.isActive, true)];

    if (filters?.name) conditions.push(ilike(products.name, `%${filters.name}%`));
    if (filters?.category) conditions.push(eq(products.category, filters.category));

    return db
      .select()
      .from(products)
      .where(and(...conditions));
  }

  // Получаем продукт по id
  static async getProductById(id: string): Promise<IProduct | null> {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products._id, id))
      .limit(1);
    return row ?? null;
  }

  // Получаем продукты по списку id
  static async getProductsById(ids: string[]): Promise<IProduct[]> {
    if (ids.length === 0) return [];
    return db.select().from(products).where(inArray(products._id, ids));
  }

  // Создаём продукт
  static async createProduct(product: INewProduct): Promise<IProduct> {
    const [row] = await db.insert(products).values(product).returning();
    return row!;
  }

  // Обновляем продукт
  static async updateProduct(
    id: string,
    product: Partial<INewProduct>
  ): Promise<IProduct | null> {
    const [row] = await db
      .update(products)
      .set(product)
      .where(eq(products._id, id))
      .returning();
    return row ?? null;
  }

  // Удаляем продукт, возвращаем пути его изображений (для удаления файлов)
  static async deleteProduct(
    id: string
  ): Promise<string[] | null | undefined> {
    const [row] = await db
      .delete(products)
      .where(eq(products._id, id))
      .returning();
    return row?.image;
  }
}
