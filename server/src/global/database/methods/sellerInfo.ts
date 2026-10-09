import { sql } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { sellerInfo } from "../shema";
import type { ISellerInfo, SellerLink } from "../shema";

export type SellerInfoData = {
  fullName: string;
  inn: string;
  phone: string;
  email: string;
  links: SellerLink[];
};

export class SellerInfoMethods {
  /** null — реквизиты ещё ни разу не сохраняли. */
  static async get(conn: DB = db): Promise<ISellerInfo | null> {
    const [row] = await conn.select().from(sellerInfo).limit(1);
    return row ?? null;
  }

  // Строка одна (id = 1): первое сохранение её создаёт, следующие перезаписывают.
  static async upsert(data: SellerInfoData, conn: DB = db): Promise<ISellerInfo> {
    const [row] = await conn
      .insert(sellerInfo)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({ target: sellerInfo.id, set: { ...data, updatedAt: sql`now()` } })
      .returning();
    return row!;
  }
}
