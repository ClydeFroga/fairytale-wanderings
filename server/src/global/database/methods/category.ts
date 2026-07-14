import { asc, eq } from "drizzle-orm";
import { db } from "../DatabaseSingleton";
import { categories } from "../shema";
import type { ICategory, INewCategory } from "../shema";

export class CategoryMethods {
  static getList(): Promise<ICategory[]> {
    return db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  static async getBySlug(slug: string): Promise<ICategory | null> {
    const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return row ?? null;
  }

  static async create(data: INewCategory): Promise<ICategory> {
    const [row] = await db.insert(categories).values(data).returning();
    return row!;
  }
}
