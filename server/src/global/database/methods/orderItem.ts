import { db, type DB } from "../DatabaseSingleton";
import { orderItems } from "../shema";
import type { INewOrderItem } from "../shema";

export class OrderItemMethods {
  static async addMany(items: INewOrderItem[], conn: DB = db): Promise<void> {
    if (items.length) await conn.insert(orderItems).values(items);
  }
}
