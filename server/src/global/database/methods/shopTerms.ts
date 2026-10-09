import { sql } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { shopTerms } from "../shema";
import type { IShopTerms, StoredDocument } from "../shema";

export type ShopTermsData = {
  paymentText: string;
  deliveryText: string;
  returnsText: string;
  // Ключа нет — документ не трогаем; null — документ убран.
  offer?: StoredDocument | null;
  privacy?: StoredDocument | null;
};

export class ShopTermsMethods {
  /** null — страницу ещё ни разу не сохраняли. */
  static async get(conn: DB = db): Promise<IShopTerms | null> {
    const [row] = await conn.select().from(shopTerms).limit(1);
    return row ?? null;
  }

  // Строка одна (id = 1): первое сохранение её создаёт, следующие перезаписывают.
  static async upsert(data: ShopTermsData, conn: DB = db): Promise<IShopTerms> {
    const [row] = await conn
      .insert(shopTerms)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({ target: shopTerms.id, set: { ...data, updatedAt: sql`now()` } })
      .returning();
    return row!;
  }
}
