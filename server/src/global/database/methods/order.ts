import { desc, eq, getTableColumns } from "drizzle-orm";
import { db, type DB } from "../DatabaseSingleton";
import { orders, users } from "../shema";
import type { INewOrder, IOrder } from "../shema";
import type { OrderView } from "../types";

// Заказ + телеграм-профиль покупателя: id нужен для уведомлений, username и
// имя — чтобы владелица могла написать клиенту из CRM.
const orderView = {
  ...getTableColumns(orders),
  telegramId: users.telegramId,
  telegramUsername: users.username,
  telegramFirstName: users.firstName,
  telegramLastName: users.lastName,
};

export class OrderMethods {
  static async create(data: INewOrder, conn: DB = db): Promise<IOrder> {
    const [row] = await conn.insert(orders).values(data).returning();
    return row!;
  }

  // Новые сверху — в CRM важны свежие заказы.
  static getList(): Promise<OrderView[]> {
    return db
      .select(orderView)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));
  }

  static async getById(id: string): Promise<OrderView | null> {
    const [row] = await db
      .select(orderView)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id))
      .limit(1);
    return row ?? null;
  }

  static async updateStatus(id: string, status: IOrder["status"]): Promise<IOrder | null> {
    const [row] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return row ?? null;
  }
}
