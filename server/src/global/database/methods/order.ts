import { db, type DB } from "../DatabaseSingleton";
import { orders } from "../shema";
import type { INewOrder, IOrder } from "../shema";

export class OrderMethods {
  static async create(data: INewOrder, conn: DB = db): Promise<IOrder> {
    const [row] = await conn.insert(orders).values(data).returning();
    return row!;
  }
}
