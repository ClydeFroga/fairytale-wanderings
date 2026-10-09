import { sql } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { aboutPage } from "../shema";
import type { IAboutPage } from "../shema";

export type AboutPageData = { title: string; body: string; images: string[] };

export class AboutPageMethods {
  /** null — страницу ещё ни разу не сохраняли. */
  static async get(conn: DB = db): Promise<IAboutPage | null> {
    const [row] = await conn.select().from(aboutPage).limit(1);
    return row ?? null;
  }

  // Строка одна (id = 1): первое сохранение её создаёт, следующие перезаписывают.
  static async upsert(data: AboutPageData, conn: DB = db): Promise<IAboutPage> {
    const [row] = await conn
      .insert(aboutPage)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({ target: aboutPage.id, set: { ...data, updatedAt: sql`now()` } })
      .returning();
    return row!;
  }
}
