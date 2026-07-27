import { eq, getTableColumns, inArray } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { orderItems, products } from "../shema";
import type { INewOrderItem } from "../shema";
import type { OrderItemView } from "../types";

// Название товара берём join-ом: в позиции зафиксирована только цена, а товар
// мог с тех пор переименоваться или вовсе исчезнуть (тогда null).
const orderItemView = {
  ...getTableColumns(orderItems),
  productName: products.name,
};

export class OrderItemMethods {
  static async addMany(items: INewOrderItem[], conn: DB = db): Promise<void> {
    if (items.length) await conn.insert(orderItems).values(items);
  }

  static getByOrderIds(orderIds: string[]): Promise<OrderItemView[]> {
    if (orderIds.length === 0) return Promise.resolve([]);
    return db
      .select(orderItemView)
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products._id))
      .where(inArray(orderItems.orderId, orderIds));
  }
}
