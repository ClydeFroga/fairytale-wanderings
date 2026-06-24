import { db } from "../DatabaseSingleton";
import { orders, orderItems } from "../shema";
import type { INewOrder, INewOrderItem, IOrder } from "../shema";

export class OrderMethods {
  static async create(data: INewOrder): Promise<IOrder> {
    const [row] = await db.insert(orders).values(data).returning();
    return row!;
  }

  static async addItems(items: INewOrderItem[]): Promise<void> {
    if (items.length) await db.insert(orderItems).values(items);
  }
}
