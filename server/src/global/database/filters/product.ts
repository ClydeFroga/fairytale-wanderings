import { eq, ilike, type SQL } from "drizzle-orm";
import { products, categories } from "../shema";
import type { ProductListFilters } from "../types";

// Условия применяются к запросу с leftJoin(categories) — см. ProductMethods.getList.
export function buildProductListConditions(filters?: ProductListFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters?._id) conditions.push(eq(products._id, filters._id));
  if (filters?.name) conditions.push(ilike(products.name, `%${filters.name}%`));
  if (filters?.category) conditions.push(eq(categories.slug, filters.category));

  // По умолчанию показываем только активные товары.
  if (filters?.isActive === undefined) {
    conditions.push(eq(products.isActive, true));
  } else {
    conditions.push(eq(products.isActive, filters.isActive));
  }

  return conditions;
}
