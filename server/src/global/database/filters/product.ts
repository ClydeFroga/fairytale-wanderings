import { eq, ilike, type SQL } from "drizzle-orm";
import { products } from "../shema";
import type { ProductListFilters } from "../types";

const ILIKE_KEYS = new Set<keyof ProductListFilters>(["name"]);

export function buildProductListConditions(filters?: ProductListFilters): SQL[] {
  const conditions: SQL[] = [];

  if (filters) {
    for (const key of Object.keys(filters) as (keyof ProductListFilters)[]) {
      const value = filters[key];
      if (value === undefined) continue;

      if (ILIKE_KEYS.has(key) && typeof value === "string") {
        conditions.push(ilike(products.name, `%${value}%`));
        continue;
      }

      conditions.push(eq(products[key], value));
    }
  }

  if (filters?.isActive === undefined) {
    conditions.push(eq(products.isActive, true));
  }

  return conditions;
}
