import { db, type DB } from "../DatabaseSingleton";
import { products, categories } from "../shema";
import type { IProduct } from "../shema";
import { seedCategoriesData, seedProductsData } from "./data";
import { uniqueSlug } from "../../utils/slugify";

// Сидит категории, затем товары, резолвя categorySlug -> categoryId.
export async function seedProducts(conn: DB = db): Promise<IProduct[]> {
  const cats = await conn.insert(categories).values(seedCategoriesData).returning();
  const idBySlug = new Map(cats.map((c) => [c.slug, c.id]));
  const taken = new Set<string>();

  const rows = seedProductsData.map(({ categorySlug, ...product }) => {
    const slug = uniqueSlug(product.name, taken, "product");
    taken.add(slug);
    return {
      ...product,
      slug,
      categoryId: idBySlug.get(categorySlug) ?? null,
    };
  });

  return conn.insert(products).values(rows).returning();
}
